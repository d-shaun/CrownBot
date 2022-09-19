import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import Artist from "../handlers/LastFM_components/Artist";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";
import time_difference from "../misc/time_difference";

import moment from "moment";
// @ts-ignore
import abbreviate from "number-abbreviate";
import Track from "../handlers/LastFM_components/Track";
import { UserTrack } from "../interfaces/TrackInterface";
import { AlbumLogInterface } from "../models/AlbumLog";
import { TrackLogInterface } from "../models/TrackLog";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trackplays")
    .setDescription("Displays user's play count of a track.")
    .addStringOption((option) =>
      option
        .setName("track_name")
        .setDescription("Track name (defaults to now-playing)")
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
    interaction: GuildChatInteraction
  ) {
    const response = new BotMessage({
      bot,
      interaction,
    });

    const db = new DB(bot.models);
    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (!user) return;
    const lastfm_user = new User({
      username: user.username,
    });

    let track_name = interaction.options.getString("track_name");
    let artist_name = interaction.options.getString("artist_name");

    if (!track_name) {
      const now_playing = await lastfm_user.get_nowplaying(bot, interaction);
      if (!now_playing) return;
      track_name = now_playing.name;
      artist_name = now_playing.artist["#text"];
    }

    if (!artist_name) {
      const query = await new Track({
        name: track_name,
        limit: 1,
      }).search();

      if (query.lastfm_errorcode || !query.success) {
        response.error("lastfm_error", query.lastfm_errormessage);
        return;
      }

      const track = query.data.results.trackmatches.track.shift();

      if (!track) {
        response.text = `Couldn't find the track.`;
        await response.send();
        return;
      }
      track_name = track.name;
      artist_name = track.artist;
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

    const last_log = await bot.models.tracklog.findOne(<AlbumLogInterface>{
      name: track.name,
      artistName: track.artist.name,
      userID: interaction.user.id,
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

    const embed = new EmbedBuilder()
      .setTitle(`Track plays`)
      .setDescription(
        `**${esm(track.name)}** by **${track.artist.name}** — ${
          track.userplaycount
        } play(s)` +
          `${percentage_text.artist}\n\n` +
          `${percentage_text.track}\n\n` +
          `${aggr_str}`
      );

    await this.update_log(bot, interaction, track);
    await interaction.editReply({ embeds: [embed] });
  },

  async update_log(
    bot: CrownBot,
    interaction: GuildChatInteraction,
    track: UserTrack["track"]
  ) {
    const timestamp = moment.utc().valueOf();

    await bot.models.tracklog.findOneAndUpdate(
      <TrackLogInterface>{
        name: track.name,
        artistName: track.artist.name,
        userID: interaction.user.id,
      },
      {
        name: track.name,
        artistName: track.artist.name,
        userplaycount: track.userplaycount,
        userID: interaction.user.id,
        timestamp,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
  },
};
