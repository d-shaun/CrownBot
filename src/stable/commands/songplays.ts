import { AxiosResponse } from "axios";
import { Message, MessageEmbed } from "discord.js";
import moment from "moment";
// @ts-ignore
import abbreviate from "number-abbreviate";

import { AlbumLogInterface } from "../models/AlbumLog";
import { TrackLogInterface } from "../models/TrackLog";
import Command from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import BotMessage from "../../handlers/BotMessage";
import DB from "../../handlers/DB";
import LastFMUser from "../../handlers/LastFMUser";
import { LastFM } from "../../handlers/LastFM";
import { Template } from "../../classes/Template";
import cb from "../../misc/codeblock";
import { ArtistInterface } from "../../interfaces/ArtistInterface";
import { TrackInterface } from "../../interfaces/TrackInterface";
import time_difference from "../../misc/time_difference";
class SongPlaysCommand extends Command {
  constructor() {
    super({
      name: "songplays",
      description: "Displays user's play count of a song.",
      usage: [
        "songplays",
        "songplays <song name>",
        "songplays <song name> || <artist name>",
      ],
      aliases: ["spl"],
      examples: [
        "songplays Mystery of Love",
        "songplays The Rip || Portishead",
        "songplays Little Faith || The National",
      ],
      require_login: true,
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild?.id, message.author.id);
    if (!user) return;

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
            "help spl",
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
    const { status, data } = <AxiosResponse>await new LastFM().query({
      method: "track.getinfo",
      params: {
        track: track_name,
        artist: artist_name,
        username: user.username,
        autocorrect: 1,
      },
    });

    let axios_response = <AxiosResponse>await new LastFM().query({
      method: "artist.getinfo",
      params: {
        artist: artist_name,
        username: user.username,
        autocorrect: 1,
      },
    });

    if (
      data.error ||
      axios_response.data.error ||
      !data.track ||
      !axios_response.data.artist
    ) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    const artist_info: ArtistInterface = axios_response.data.artist;

    const track: TrackInterface = data.track;

    if (!track.userplaycount) return;
    let last_count = 0;

    let strs = {
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
    if (artist_info.stats && artist_info.stats.userplaycount) {
      artist_plays = artist_info.stats.userplaycount;
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
        `**${track.name}** by **${track.artist.name}** — ${track.userplaycount} play(s)` +
          `${percentage_text.artist}\n\n` +
          `${percentage_text.track}\n\n` +
          `${aggr_str}`
      );

    await this.update_log(client, message, track);
    await message.channel.send(embed);
  }

  async update_log(client: CrownBot, message: Message, track: TrackInterface) {
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
        // @ts-ignore
        useFindAndModify: false,
      }
    );
  }
}

export default SongPlaysCommand;
