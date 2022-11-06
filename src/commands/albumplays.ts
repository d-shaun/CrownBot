import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import Artist from "../handlers/LastFM_components/Artist";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";
import time_difference from "../misc/time_difference";

import moment from "moment";
// @ts-ignore
import abbreviate from "number-abbreviate";
import { CommandResponse } from "../handlers/CommandResponse";
import Album from "../handlers/LastFM_components/Album";
import { UserAlbum } from "../interfaces/AlbumInterface";
import { AlbumLogInterface } from "../models/AlbumLog";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("albumplays")
    .setDescription("Display user's playcount of an album")
    .addStringOption((option) =>
      option
        .setName("album_name")
        .setDescription("Album name (defaults to now-playing)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("artist_name")
        .setDescription("The artist's name")
        .setRequired(false)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    response.allow_retry = true;
    const db = new DB(bot.models);
    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (!user) return response.fail();
    const lastfm_user = new User({
      username: user.username,
    });

    let album_name = interaction.options.getString("album_name");
    let artist_name = interaction.options.getString("artist_name");
    if (!album_name) {
      const now_playing = await lastfm_user.new_get_nowplaying(
        interaction,
        response
      );
      if (now_playing instanceof CommandResponse) return now_playing;

      artist_name = now_playing.artist["#text"];
      album_name = now_playing.album["#text"];
    }

    if (!artist_name) {
      const query = await new Album({
        name: album_name,
        limit: 1,
      }).search();

      if (query.lastfm_errorcode || !query.success) {
        return response.error("lastfm_error", query.lastfm_errormessage);
      }

      const album = query.data.results.albummatches.album.shift();
      if (!album) {
        return response.error("custom", "Couldn't find the album.");
      }
      artist_name = album.artist;
      album_name = album.name;
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
      return response.error("lastfm_error", query_album.lastfm_errormessage);
    }

    if (query_artist.lastfm_errorcode || !query_artist.success) {
      return response.error("lastfm_error", query_artist.lastfm_errormessage);
    }

    const artist = query_artist.data.artist;
    const album = query_album.data.album;

    if (album.userplaycount === undefined) return response.fail();
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

    const last_log = await bot.models.albumlog.findOne(<AlbumLogInterface>{
      name: album.name,
      artistName: album.artist,
      userID: interaction.user.id,
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

    const embed = new EmbedBuilder()
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
    await this.update_log(bot, interaction, album);
    response.embeds = [embed];
    return response;
  },

  async update_log(
    client: CrownBot,
    interaction: GuildChatInteraction,
    album: UserAlbum["album"]
  ) {
    const timestamp = moment.utc().valueOf();

    await client.models.albumlog.findOneAndUpdate(
      <AlbumLogInterface>{
        name: album.name,
        artistName: album.artist,
        userID: interaction.user.id,
      },
      {
        name: album.name,
        artistName: album.artist,
        userID: interaction.user.id,
        userplaycount: album.userplaycount,
        timestamp,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
  },
};
