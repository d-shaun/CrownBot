import { FieldsEmbed } from "discord-paginationembed";
import { GuildMember, TextChannel } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import Album from "../../handlers/LastFM_components/Album";
import User from "../../handlers/LastFM_components/User";
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

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = client.cache.prefix.get(message.guild);
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;

    const response = new BotMessage({ client, message, text: "", reply: true });
    const lastfm_user = new User({
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
      const str = args.join(" ");
      const str_array = str.split("||");
      if (str_array.length !== 2) {
        const query = await new Album({
          name: str_array.join().trim(),
        }).search();
        if (query.lastfm_errorcode || !query.success) {
          response.error("lastfm_error", query.lastfm_errormessage);
          return;
        }

        const album = query.data.results.albummatches.album[0];

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

    const query = await new Album({
      name: album_name,
      artist_name,
      username: user.username,
    }).user_get_info();
    if (query.lastfm_errorcode || !query.success) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }
    const album = query.data.album;
    const users = (await get_registered_users(client, message))?.users;
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
        new Album({
          name: album_name,
          artist_name,
          username: user.database.username,
        })
          .user_get_info()
          .then((res) => {
            const response_with_context = {
              wrapper: res,
              context,
            };
            return response_with_context;
          })
      );
    }
    let responses = await Promise.all(lastfm_requests);

    if (
      !responses.length ||
      responses.some((response) => !response.wrapper.data?.album?.playcount)
    ) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    responses = responses.filter((response) => response.wrapper.success);
    let leaderboard: LeaderboardInterface[] = [];

    interface ContextInterface {
      discord_user: GuildMember;
      lastfm_username: string;
    }

    responses.forEach((response) => {
      const album = response.wrapper.data.album;
      const context = response.context;
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
        guild_id: message.guild.id,
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
