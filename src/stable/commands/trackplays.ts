import { MessageEmbed } from "discord.js";
import moment from "moment";
// @ts-ignore
import abbreviate from "number-abbreviate";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import Artist from "../../handlers/LastFM_components/Artist";
import Track from "../../handlers/LastFM_components/Track";
import User from "../../handlers/LastFM_components/User";
import { UserTrack } from "../../interfaces/TrackInterface";
import cb from "../../misc/codeblock";
import esm from "../../misc/escapemarkdown";
import time_difference from "../../misc/time_difference";
import { AlbumLogInterface } from "../models/AlbumLog";
import { TrackLogInterface } from "../models/TrackLog";

class TrackPlaysCommand extends Command {
  constructor() {
    super({
      name: "trackplays",
      description: "Displays user's play count of a song.",
      usage: [
        "trackplays",
        "trackplays <song name>",
        "trackplays <song name> || <artist name>",
      ],
      aliases: ["tp", "tpl", "spl"],
      extra_aliases: ["songplays"],
      examples: [
        "trackplays Mystery of Love",
        "trackplays The Rip || Portishead",
        "trackplays Little Faith || The National",
      ],
      require_login: true,
      category: "userstat",
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = client.cache.prefix.get(message.guild);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;

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
            "help tpl",
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
    const track_query = await new Track({
      name: track_name,
      artist_name,
      username: user.username,
    }).user_get_info();

    const artist_query = await new Artist({
      name: artist_name,
      username: user.username,
    }).user_get_info();

    if (
      artist_query.lastfm_errorcode ||
      track_query.lastfm_errorcode ||
      !(artist_query.success && track_query.success)
    ) {
      await response.error("lastfm_error", artist_query.lastfm_errormessage);
      return;
    }
    const artist = artist_query.data.artist;

    const track = track_query.data.track;

    if (track.userplaycount === undefined) return;
    let last_count = 0;

    const strs = {
      count: "No change",
      time: <boolean | string>false,
    };

    const last_log = await client.models.tracklog.findOne(<AlbumLogInterface>{
      name: track.name,
      artistName: track.artist.name,
      userID: message.author.id,
    });
    if (last_log) {
      last_count = last_log.userplaycount;
      strs.time = time_difference(last_log.timestamp);
    }
    const count_diff = parseInt(track.userplaycount) - last_count;
    if (count_diff < 0) {
      strs.count = `:small_red_triangle_down: ${count_diff}`;
    } else if (count_diff > 0) {
      strs.count = `+${count_diff}`;
    }

    const aggr_str = strs.time
      ? `**${strs.count}** since last checked ${strs.time} ago.`
      : "";
    let artist_plays = "";
    if (artist.stats && artist.stats.userplaycount) {
      artist_plays = artist.stats.userplaycount;
    }

    const percentage = {
      track: (
        (parseInt(track.userplaycount) / parseInt(track.playcount)) *
        100
      ).toFixed(2),
      artist: (
        (parseInt(track.userplaycount) / parseInt(artist_plays)) *
        100
      ).toFixed(2),
    };

    const percentage_text = {
      track: `(**${percentage.track}%** of ${abbreviate(
        track.playcount,
        1
      )} global track plays)`,
      artist: ` — **${percentage.artist}%** of **${abbreviate(
        artist_plays,
        1
      )}** artist plays `,
    };

    if (percentage.artist === "NaN") {
      percentage_text.artist = "";
    }

    const embed = new MessageEmbed()
      .setTitle(`Track plays`)
      .setDescription(
        `**${esm(track.name)}** by **${track.artist.name}** — ${
          track.userplaycount
        } play(s)` +
          `${percentage_text.artist}\n\n` +
          `${percentage_text.track}\n\n` +
          `${aggr_str}`
      );

    await this.update_log(client, message, track);
    await message.channel.send(embed);
  }

  async update_log(
    client: CrownBot,
    message: GuildMessage,
    track: UserTrack["track"]
  ) {
    const timestamp = moment.utc().valueOf();

    await client.models.tracklog.findOneAndUpdate(
      <TrackLogInterface>{
        name: track.name,
        artistName: track.artist.name,
        userID: message.author.id,
      },
      {
        name: track.name,
        artistName: track.artist.name,
        userplaycount: track.userplaycount,
        userID: message.author.id,
        timestamp,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
  }
}

export default TrackPlaysCommand;
