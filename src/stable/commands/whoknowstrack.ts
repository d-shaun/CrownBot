import { FieldsEmbed } from "discord-paginationembed";
import { GuildMember, TextChannel } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import { LastFM, ResponseInterface } from "../../handlers/LastFM";
import LastFMUser from "../../handlers/LastFMUser";
import { LeaderboardInterface } from "../../interfaces/LeaderboardInterface";
import { TrackInterface } from "../../interfaces/TrackInterface";
import cb from "../../misc/codeblock";
import get_registered_users from "../../misc/get_registered_users";
import time_difference from "../../misc/time_difference";
import { LogInterface } from "../models/WhoPlaysLog";

class WhoKnowsTrack extends Command {
  constructor() {
    super({
      name: "whoknowstrack",
      description: "Checks if anyone in a guild listens to a certain track. ",
      usage: ["whoknowstrack", "whoknowstrack <song name> || <artist name>"],
      aliases: ["wkt", "wp"],
      extra_aliases: ["whoplays", "wpl"],
      examples: [
        "whoknowstrack Last Man Standing || People In Planes",
        "whoknowstrack Under Control || The Strokes",
      ],
      required_permissions: ["MANAGE_MESSAGES"],
      require_login: true,
      category: "serverstat",
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = client.cache.prefix.get(message.guild);
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
            "help wkt",
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
        autocorrect: 1,
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
        discord_user: user.discord,
        lastfm_username: user.database.username,
      };
      lastfm_requests.push(
        new LastFM()
          .query({
            method: "track.getinfo",
            params: {
              artist: artist_name,
              track: track_name,
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
      responses.some((response) => !response?.data?.track?.playcount)
    ) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    responses = responses
      .filter((response) => response.status !== 404)
      .filter((response) => {
        // filter out users who have deleted their Last.fm account
        const track: TrackInterface = response.data.track;
        return !(track && !track.userplaycount);
      });

    let leaderboard: LeaderboardInterface[] = [];

    interface ContextInterface {
      discord_user: GuildMember;
      lastfm_username: string;
    }

    responses.forEach(({ data }) => {
      const track: TrackInterface = data.track;
      const context: ContextInterface = data.context;
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
      response.text = `No one here has played ${cb(track.name)} by ${cb(
        track.artist.name
      )}.`;
      await response.send();
      return;
    }

    const last_log:
      | LogInterface
      | undefined = await client.models.whoplayslog.findOne({
      track_name: track.name,
      artist_name: track.artist.name,
      guild_id: message.guild.id,
    });
    if (last_log && last_log.stat) {
      const { stat } = last_log;
      leaderboard = leaderboard.map((entry) => {
        const log = stat.find((lg) => {
          return lg.user_id === entry.user_id;
        });
        if (log) {
          entry.last_count = log.userplaycount;
        }
        return entry;
      });
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
          let count_diff;
          let diff_str = "";
          if (elem.last_count) {
            count_diff =
              parseInt(elem.userplaycount) - parseInt(elem.last_count);
          }
          if (count_diff && count_diff < 0) {
            diff_str = ` ― (:small_red_triangle_down: ${count_diff} ${
              count_diff > 1 ? "plays" : "play"
            })`;
          } else if (count_diff && count_diff > 0) {
            diff_str = ` ― (+${count_diff} ${
              count_diff > 1 ? "plays" : "play"
            })`;
          }
          const index =
            leaderboard.findIndex((e) => e.user_id === elem.user_id) + 1;

          return `${index + "."} ${el.discord_username} — **${
            el.userplaycount
          } play(s)** ${diff_str}`;
        }
      );

    let footer_text = `Psst, try ${server_prefix}about to find the support server.`;
    if (last_log) {
      footer_text = `Last checked ${time_difference(last_log.timestamp)} ago.`;
    }
    fields_embed.embed
      .setColor(message.member?.displayColor || "000000")
      .setTitle(
        `Who knows the track ${cb(track.name)} by ${cb(track.artist.name)}?`
      )
      .setFooter(footer_text);
    fields_embed.on("start", () => {
      message.channel.stopTyping(true);
    });
    await db.log_whoplays(
      track.name,
      track.artist.name,
      leaderboard,
      message.guild.id
    );
    await fields_embed.build();
  }
}

export default WhoKnowsTrack;
