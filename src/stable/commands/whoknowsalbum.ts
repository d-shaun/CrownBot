import { FieldsEmbed } from "discord-paginationembed";
import { GuildMember, Message, TextChannel } from "discord.js";
import Command from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import { LastFM, ResponseInterface } from "../../handlers/LastFM";
import LastFMUser from "../../handlers/LastFMUser";
import { AlbumInterface } from "../../interfaces/AlbumInterface";
import { LeaderboardInterface } from "../../interfaces/LeaderboardInterface";
import cb from "../../misc/codeblock";
import esm from "../../misc/escapemarkdown";
import get_registered_users from "../../misc/get_registered_users";

class WhoKnowsAlbum extends Command {
  constructor() {
    super({
      name: "whoknowsalbum",
      description: "Checks if anyone in a guild listens to a certain album. ",
      usage: ["whoknowsalbum", "whoknowsalbum <album name> || <artist name>"],
      aliases: ["wka"],
      extra_aliases: ["whoplaysalbum", "wpa"],
      examples: [
        "whoknowsalbum Eidolon || Rishloo",
        "whoknowsalbum Room On Fire || The Strokes",
      ],
      required_permissions: ["MANAGE_MESSAGES"],
      require_login: true,
      category: "serverstat",
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild?.id, message.author.id);
    if (!user) return;
    if (!message.guild) return;

    const response = new BotMessage({ client, message, text: "", reply: true });
    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    let artist_name;
    let album_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(client, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
      album_name = now_playing.album["#text"];
    } else {
      let str = args.join(" ");
      let str_array = str.split("||");
      if (str_array.length !== 2) {
        const { data } = await new LastFM().search_album(
          str_array.join().trim()
        );
        if (data.error) {
          response.text = new Template(client, message).get("lastfm_error");
          await response.send();
          return;
        }
        const album = data.results.albummatches.album[0];

        if (!album) {
          response.text = `Couldn't find the album; try providing artist name—see ${cb(
            "help wka",
            server_prefix
          )}.`;
          await response.send();
          return;
        }
        album_name = album.name;
        artist_name = album.artist;
      } else {
        album_name = str_array[0].trim();
        artist_name = str_array[1].trim();
      }
    }

    const { status, data } = await new LastFM().query({
      method: "album.getinfo",
      params: {
        artist: artist_name,
        album: album_name,
        username: user.username,
        autocorrect: 1,
      },
    });
    if (data.error === 6) {
      response.text = "Album not found.";
      response.send();
      return;
    } else if (status !== 200 || !data.album) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    const album: AlbumInterface = data.album;
    let users = (await get_registered_users(client, message))?.users;
    if (!users || users.length <= 0) {
      response.text = `No user in this guild has registered their Last.fm username; see ${cb(
        "help login",
        server_prefix
      )}`;
      await response.send();
      return;
    }

    if (users.length > 100) {
      users.length = 100; // 100 user limit
    }
    const lastfm_requests = [];

    for await (const user of users) {
      const context = {
        discord_user: user.discord,
        lastfm_username: user.database.username,
      };
      lastfm_requests.push(
        new LastFM()
          .query({
            method: "album.getinfo",
            params: {
              artist: artist_name,
              album: album_name,
              username: user.database.username,
              autocorrect: 1,
            },
          })
          .then((res) => {
            // check if response is an object because Last.fm has now started serving empty string
            if (res && typeof res.data === "object") res.data.context = context;
            return res;
          })
      );
    }
    let responses: ResponseInterface[] = [];
    await Promise.all(lastfm_requests).then((res) => (responses = res));

    if (
      !responses.length ||
      responses.some((response) => !response?.data?.album?.playcount)
    ) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    responses = responses
      .filter((response) => response.status !== 404)
      .filter((response) => {
        // filter out users who have deleted their Last.fm account
        const album: AlbumInterface = response.data.album;
        return !(album && !album.userplaycount);
      });
    let leaderboard: LeaderboardInterface[] = [];

    interface ContextInterface {
      discord_user: GuildMember;
      lastfm_username: string;
    }

    responses.forEach(({ data }) => {
      const album: AlbumInterface = data.album;
      const context: ContextInterface = data.context;
      if (!context || !context.discord_user) return;
      if (!album.userplaycount) return;
      if (parseInt(album.userplaycount) <= 0) return;
      leaderboard.push({
        album_name: album.name,
        artist_name: album.artist,
        discord_username: context.discord_user?.user.username,
        lastfm_username: context.lastfm_username,
        userplaycount: album.userplaycount,
        user_id: context.discord_user.user.id,
        user_tag: context.discord_user.user.tag,
        guild_id: message.guild?.id,
      });
    });
    if (leaderboard.length <= 0) {
      response.text = `No one here has played ${cb(album.name)} by ${cb(
        album.artist
      )}.`;
      await response.send();
      return;
    }

    leaderboard = leaderboard.sort(
      (a, b) => parseInt(b.userplaycount) - parseInt(a.userplaycount)
    );
    const total_scrobbles = leaderboard.reduce(
      (a, b) => a + parseInt(b.userplaycount),
      0
    );

    const fields_embed = new FieldsEmbed()
      .setArray(leaderboard)
      .setAuthorizedUsers([])
      .setChannel(<TextChannel>message.channel)
      .setElementsPerPage(15)
      .setPageIndicator(true)
      .setDisabledNavigationEmojis(["delete"])
      .formatField(
        `${total_scrobbles} plays ― ${leaderboard.length} listener(s)\n`,
        (el: any) => {
          const elem: LeaderboardInterface = el;

          const index =
            leaderboard.findIndex((e) => e.user_id === elem.user_id) + 1;

          return `${index + "."} ${el.discord_username} — **${
            el.userplaycount
          } play(s)**`;
        }
      );
    const footer_text = `"${esm(album.name)}" by ${esm(album.artist)}`;
    fields_embed.embed
      .setColor(message.member?.displayColor || "000000")
      .setTitle(`Who knows the album ${cb(album.name)}?`)
      .setFooter(footer_text);
    fields_embed.on("start", () => {
      message.channel.stopTyping(true);
    });

    await fields_embed.build();
  }
}

export default WhoKnowsAlbum;
