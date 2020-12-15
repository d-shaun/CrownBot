import { FieldsEmbed } from "discord-paginationembed";
import { TextChannel } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import Track from "../../handlers/LastFM_components/Track";
import User from "../../handlers/LastFM_components/User";
import { LeaderboardInterface } from "../../interfaces/LeaderboardInterface";
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
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;

    const response = new BotMessage({ client, message, text: "", reply: true });
    const lastfm_user = new User({
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
      const str = args.join(" ");
      const str_array = str.split("||");
      if (str_array.length !== 2) {
        const query = await new Track({
          name: str_array.join().trim(),
          limit: 1,
        }).search();
        if (query.lastfm_errorcode || !query.success) {
          response.error("lastfm_error", query.lastfm_errormessage);
          return;
        }
        const track = query.data.results.trackmatches.track.shift();

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

    const query = await new Track({
      name: track_name,
      artist_name,
      username: user.username,
    }).user_get_info();
    if (query.lastfm_errorcode || !query.success) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }

    const track = query.data.track;
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
        new Track({
          name: track_name,
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
      responses.some((response) => !response?.wrapper.data?.track?.playcount)
    ) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    responses = responses.filter((response) => response.wrapper.success);

    let leaderboard: LeaderboardInterface[] = [];

    responses.forEach((response) => {
      const track = response.wrapper.data.track;
      const context = response.context;
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
        guild_id: message.guild.id,
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

    const fields_embed = new FieldsEmbed<typeof leaderboard[0]>()
      .setArray(leaderboard)
      .setAuthorizedUsers([])
      .setChannel(<TextChannel>message.channel)
      .setElementsPerPage(15)
      .setPageIndicator(true)
      .setDisabledNavigationEmojis(["delete"])
      .formatField(
        `${total_scrobbles} plays ― ${leaderboard.length} listener(s)\n`,
        (elem) => {
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

          return `${index + "."} ${elem.discord_username} — **${
            elem.userplaycount
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
