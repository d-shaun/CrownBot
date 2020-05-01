import { AxiosResponse } from "axios";
import { Message, MessageEmbed } from "discord.js";
import moment from "moment";
// @ts-ignore
import abbreviate from "number-abbreviate";
import Command from "../classes/Command";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import { LastFM } from "../handlers/LastFM";
import LastFMUser from "../handlers/LastFMUser";
import { AlbumInterface } from "../interfaces/AlbumInterface";
import { ArtistInterface } from "../interfaces/ArtistInterface";
import cb from "../misc/codeblock";
import time_difference from "../misc/time_difference";
import { AlbumLogInterface } from "../models/AlbumLog";
class AlbumPlaysCommand extends Command {
  constructor() {
    super({
      name: "albumplays",
      description: "Displays user's play count of an album.",
      usage: ["albumplays", "albumplays <album name> || <artist name>"],
      aliases: ["alp", "alpl"],
      examples: [
        "albumplays Disintegration || The Cure",
        "albumplays Empath || Devin Townsend",
      ],
      require_login: true,
    });
  }

  async run(client: CrownBot, message: Message, args: String[]) {
    const server_prefix = client.get_cached_prefix(message);
    const reply = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.author.id);
    if (!user) return;

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
        const { status, data } = await new LastFM().search_album(
          str_array.join().trim()
        );
        if (data.error) {
          reply.text = new Template(client, message).get("lastfm_error");
          await reply.send();
          return;
        }
        let album = data.results.albummatches.album[0];

        if (!album) {
          reply.text = `Couldn't find the album; try providing artist name—see ${cb(
            "alp",
            server_prefix
          )}.`;
          await reply.send();
          return;
        }
        artist_name = album.artist;
        album_name = album.name;
      } else {
        album_name = str_array[0].trim();
        artist_name = str_array[1].trim();
      }
    }
    const { status, data } = <AxiosResponse>await new LastFM().query({
      method: "album.getinfo",
      params: {
        album: album_name,
        artist: artist_name,
        username: user.username,
        auto_correct: 1,
      },
    });
    if (status !== 200) return;

    let response = <AxiosResponse>await new LastFM().query({
      method: "artist.getinfo",
      params: {
        artist: artist_name,
        username: user.username,
        auto_correct: 1,
      },
    });
    if (response.status !== 200) return;
    const artist_info: ArtistInterface = response.data.artist;

    const album: AlbumInterface = data.album;
    if (!album.userplaycount) return;
    let last_count = 0;
    var album_cover: boolean | string = false;

    if (album.image) {
      var last_item = album.image.pop();
      album_cover = last_item ? last_item["#text"] : false;
    }

    let strs = {
      count: "No change",
      time: <boolean | string>false,
    };

    var last_log = await client.models.albumlog.findOne(<AlbumLogInterface>{
      name: album.name,
      artistName: album.artist,
      userID: message.author.id,
    });
    if (last_log) {
      last_count = last_log.userplaycount;
      strs.time = time_difference(last_log.timestamp);
    }
    const count_diff = parseInt(album.userplaycount) - last_count;
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
      album: (
        (parseInt(album.userplaycount) / parseInt(album.playcount)) *
        100
      ).toFixed(2),
      artist: (
        (parseInt(album.userplaycount) / parseInt(artist_plays)) *
        100
      ).toFixed(2),
    };

    const percentage_text = {
      album: `(**${percentage.album}%** of ${abbreviate(
        album.playcount,
        1
      )} album plays)`,
      artist: ` — **${percentage.artist}%** of **${abbreviate(
        artist_plays,
        1
      )}** artist plays `,
    };

    if (percentage.artist == "NaN") {
      percentage_text.artist = "";
    }

    const embed = new MessageEmbed()
      .setTitle(`Album plays`)
      .setDescription(
        `**${album.name}** by **${album.artist}** — ${album.userplaycount} play(s)` +
          `${percentage_text.artist}\n\n` +
          `${percentage_text.album}\n\n` +
          `${aggr_str}`
      );

    await this.update_log(client, message, album);
    await message.channel.send(embed);
  }

  async update_log(client: CrownBot, message: Message, album: AlbumInterface) {
    const timestamp = moment.utc().valueOf();

    await client.models.albumlog.findOneAndUpdate(
      <AlbumLogInterface>{
        name: album.name,
        artistName: album.artist,
        userID: message.author.id,
      },
      {
        name: album.name,
        artistName: album.artist,
        userID: message.author.id,
        userplaycount: album.userplaycount,
        timestamp,
      },
      {
        upsert: true,
        //@ts-ignore
        useFindAndModify: false,
      }
    );
  }
}

export default AlbumPlaysCommand;