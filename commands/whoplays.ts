import { AxiosResponse } from "axios";
import { FieldsEmbed } from "discord-paginationembed";
import { GuildMember, Message, TextChannel } from "discord.js";
import Command from "../classes/Command";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import { LastFM } from "../handlers/LastFM";
import LastFMUser from "../handlers/LastFMUser";
import { LeaderboardInterface } from "../interfaces/LeaderboardInterface";
import { TrackInterface } from "../interfaces/TrackInterface";
import cb from "../misc/codeblock";
import get_registered_users from "../misc/get_registered_users";

class WhoPlaysCommand extends Command {
  constructor() {
    super({
      name: "whoplays",
      description: "Checks if anyone in a guild listens to a certain track. ",
      usage: ["whoplays", "whoplays <song name> || <artist name>"],
      aliases: ["wp"],
      examples: [
        "whoplays Last Man Standing || People In Planes",
        "whoplays Under Control || The Strokes",
      ],
    });
  }

  async run(client: CrownBot, message: Message, args: String[]) {
    const server_prefix = client.get_cached_prefix(message);
    const db = new DB(client.models);
    const user = await db.fetch_user(message.author.id);
    if (!user) return;
    if (!message.guild) return;

    const response = new BotMessage({ client, message, text: "", reply: true });
    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    let artist_name;
    let track_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(client, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
      track_name = now_playing.name;
    } else {
      let str = args.join(" ");
      let str_array = str.split("||");
      if (str_array.length !== 2) {
        const { data } = await new LastFM().search_track(
          str_array.join().trim()
        );
        if (data.error) {
          response.text = new Template(client, message).get("lastfm_error");
          await response.send();
          return;
        }
        const track = data.results.trackmatches.track[0];

        if (!track) {
          response.text = `Couldn't find the track; try providing artist name—see ${cb(
            "help whoplays",
            server_prefix
          )}.`;
          await response.send();
          return;
        }
        track_name = track.name;
        artist_name = track.artist;
      } else {
        track_name = str_array[0].trim();
        artist_name = str_array[1].trim();
      }
    }

    const { status, data } = await new LastFM().query({
      method: "track.getinfo",
      params: {
        artist: artist_name,
        track: track_name,
        username: user.username,
        auto_correct: 1,
      },
    });
    if (data.error === 6) {
      response.text = "Track not found.";
      response.send();
      return;
    } else if (status !== 200 || !data.track) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    const track: TrackInterface = data.track;
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
        discord_user: message.guild?.members.cache.find(
          (e) => e.id === user.userID
        ),
        lastfm_username: user.username,
      };
      lastfm_requests.push(
        new LastFM()
          .query({
            method: "track.getinfo",
            params: {
              artist: artist_name,
              track: track_name,
              username: user.username,
              auto_correct: 1,
            },
          })
          .then((res) => {
            res.data.context = context;
            return res;
          })
      );
    }
    var responses: AxiosResponse[] = [];
    await Promise.all(lastfm_requests).then((res) => (responses = res));

    if (
      !responses.length ||
      responses.some((response) => !response.data || !response.data.track)
    ) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    responses = responses
      .filter((response: AxiosResponse) => response.status !== 404)
      .filter((response) => {
        // filter out users who have deleted their Last.fm account
        const track: TrackInterface = response.data.track;
        return !(track && !track.userplaycount);
      });

    let leaderboard: LeaderboardInterface[] = [];

    interface contextInterface {
      discord_user: GuildMember;
      lastfm_username: string;
    }

    responses.forEach(({ data }) => {
      const track: TrackInterface = data.track;
      const context: contextInterface = data.context;
      if (!context || !context.discord_user) return;
      if (!track.userplaycount) return;
      if (parseInt(track.userplaycount) <= 0) return;
      leaderboard.push({
        track_name: track.name,
        artist_name: track.artist.name,
        discord_username: context.discord_user?.user.username,
        lastfm_username: context.lastfm_username,
        userplaycount: track.userplaycount,
        user_id: context.discord_user.user.id,
        user_tag: context.discord_user.user.tag,
        guild_id: message.guild?.id,
      });
    });
    if (leaderboard.length <= 0) {
      response.text = `No one here has played \`${track.name}\` by \`${track.artist.name}\'.`;
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
      .setDisabledNavigationEmojis(["DELETE"])
      .formatField(
        `${total_scrobbles} plays ― ${leaderboard.length} listener(s)\n`,
        (el: any) => {
          const elem: LeaderboardInterface = el;

          const index =
            leaderboard.findIndex((e) => e.user_id == elem.user_id) + 1;

          return `${index} ${el.discord_username} — **${el.userplaycount} play(s)**`;
        }
      );

    let footer_text = `Psst, try ${server_prefix}about to find the support server.`;

    fields_embed.embed
      .setColor(0x00ffff)
      .setTitle(
        `Who plays \`${track.name}\` by \`${track.artist.name}\` in ${message.guild.name}?`
      )
      .setFooter(footer_text);
    await fields_embed.build();
  }
}

export default WhoPlaysCommand;
