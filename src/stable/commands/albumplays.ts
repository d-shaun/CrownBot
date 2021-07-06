import { MessageEmbed } from "discord.js";
import moment from "moment";
// @ts-ignore
import abbreviate from "number-abbreviate";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import Album from "../../handlers/LastFM_components/Album";
import Artist from "../../handlers/LastFM_components/Artist";
import User from "../../handlers/LastFM_components/User";
import { UserAlbum } from "../../interfaces/AlbumInterface";
import cb from "../../misc/codeblock";
import esm from "../../misc/escapemarkdown";
import time_difference from "../../misc/time_difference";
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
          limit: 1,
        }).search();

        if (query.lastfm_errorcode || !query.success) {
          response.error("lastfm_error", query.lastfm_errormessage);
          return;
        }

        const album = query.data.results.albummatches.album.shift();
        if (!album) {
          response.error(
            "blank",
            "Couldn't find the album—try providing artist name; see " +
              cb("help alp", server_prefix) +
              "."
          );
          return;
        }
        artist_name = album.artist;
        album_name = album.name;
      } else {
        album_name = str_array[0].trim();
        artist_name = str_array[1].trim();
      }
    }

    const query_album = await new Album({
      name: album_name,
      artist_name,
      username: user.username,
    }).user_get_info();

    const query_artist = await new Artist({
      name: artist_name,
      username: user.username,
    }).user_get_info();

    if (query_album.lastfm_errorcode || !query_album.success) {
      response.error("lastfm_error", query_album.lastfm_errormessage);
      return;
    }

    if (query_artist.lastfm_errorcode || !query_artist.success) {
      response.error("lastfm_error", query_artist.lastfm_errormessage);
      return;
    }

    const artist = query_artist.data.artist;
    const album = query_album.data.album;

    if (album.userplaycount === undefined) return;
    let last_count = 0;
    let album_cover: boolean | string = false;

    if (album.image) {
      const last_item = album.image.pop();
      album_cover = last_item ? last_item["#text"] : false;
    }

    const strs = {
      count: "No change",
      time: <boolean | string>false,
    };

    const last_log = await client.models.albumlog.findOne(<AlbumLogInterface>{
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
    if (artist.stats && artist.stats.userplaycount) {
      artist_plays = artist.stats.userplaycount;
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
      )} global album plays)`,
      artist: ` — **${percentage.artist}%** of **${abbreviate(
        artist_plays,
        1
      )}** artist plays `,
    };

    if (percentage.artist === "NaN") {
      percentage_text.artist = "";
    }

    const embed = new MessageEmbed()
      .setTitle(`Album plays`)
      .setDescription(
        `**${esm(album.name)}** by **${esm(album.artist)}** — ${
          album.userplaycount
        } play(s)` +
          `${percentage_text.artist}\n\n` +
          `${percentage_text.album}\n\n` +
          `${aggr_str}`
      );
    if (album_cover) embed.setThumbnail(album_cover);
    await this.update_log(client, message, album);
    await message.channel.send(embed);
  }

  async update_log(
    client: CrownBot,
    message: GuildMessage,
    album: UserAlbum["album"]
  ) {
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
        useFindAndModify: false,
      }
    );
  }
}

export default AlbumPlaysCommand;
