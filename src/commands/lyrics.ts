import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";

import axios from "axios";
import moment from "moment";
import { CommandResponse } from "../handlers/CommandResponse";
import Track from "../handlers/LastFM_components/Track";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("Get the lyrics for a track")
    .addStringOption((option) =>
      option
        .setName("track_name")
        .setDescription("Track name (defaults to now-playing)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("artist_name")
        .setDescription("Artist name")
        .setRequired(false)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    response.allow_retry = true;

    // https://whateverendpoint/ --- appends ?gquery=string query
    const { LYRICS_ENDPOINT } = process.env;

    const db = new DB(bot.models);
    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (!user) return response.fail();
    const lastfm_user = new User({
      username: user.username,
    });
    let track_name = interaction.options.getString("track_name");
    let artist_name = interaction.options.getString("artist_name");
    if (!track_name) {
      const now_playing = await lastfm_user.new_get_nowplaying(
        interaction,
        response
      );
      if (now_playing instanceof CommandResponse) return now_playing;
      track_name = now_playing.name;
      artist_name = now_playing.artist["#text"];
    }
    if (!artist_name) {
      const query = await new Track({
        name: track_name,
        limit: 1,
      }).search();
      if (query.lastfm_errorcode || !query.success) {
        return response.error("lastfm_error", query.lastfm_errormessage);
      }
      const track = query.data.results.trackmatches.track.shift();
      if (!track) {
        return response.error("custom", "Couldn't find the track");
      }
      track_name = track.name;
      artist_name = track.artist;
    }
    const query = await new Track({
      name: track_name,
      artist_name,
    }).get_info();
    if (query.lastfm_errorcode || !query.success) {
      return response.error("lastfm_error", query.lastfm_errormessage);
    }
    const track = query.data.track;
    const db_entry = await bot.models.lyricslog.findOne({
      track_name: track.name,
      artist_name: track.artist.name,
    });
    const toChunks = (lyrics: string) => {
      return lyrics.match(/(.|[\r\n]){1,2000}/g);
    };
    if (db_entry) {
      const lyrics =
        `**${db_entry.track_name}** by **${db_entry.artist_name}**\n\n` +
        db_entry.lyrics;
      const lyrics_chunks = toChunks(lyrics);
      if (lyrics_chunks && lyrics_chunks.length) {
        const embeds = [];
        for (const chunk of lyrics_chunks) {
          embeds.push(new EmbedBuilder().setDescription(chunk));
        }
        response.embeds = embeds;
        return response;
      }
    }

    if (!LYRICS_ENDPOINT) {
      response.error_message =
        "Couldn't find the source to fetch lyrics from. Please contact the bot maintainer.";
      response.error_code = "custom";
      return response;
    }

    let original_lyrics: null | string = null;
    try {
      type ReturnDataType = {
        error: boolean;
        error_message: string;
        response: null | string;
        id: null | string;
      };
      const response = await axios.get<ReturnDataType>(
        LYRICS_ENDPOINT + `?gquery=${track.name} ${track.artist.name}`,
        { timeout: 30 * 1000 }
      );

      const { data } = response;

      if (data && typeof data === "object") {
        if (data.error_message !== "false" && data.response) {
          original_lyrics = data.response;
        }
      }
    } catch (error) {
      console.log(error);
      original_lyrics = null;
    }

    if (!original_lyrics) {
      response.text = "Couldn't parse lyrics for the song.";
      return response;
    }
    const lyrics = `**${esm(track.name)}** by **${esm(
      track.artist.name
    )}**\n\n${original_lyrics}`;
    if (lyrics.length > 6000) {
      response.text = "Couldn't find lyrics for the song.";
      return response;
    }
    const lyrics_chunks = toChunks(lyrics);
    if (!lyrics_chunks || !lyrics_chunks.length) {
      throw "toChunks() failed.";
    }
    const timestamp = moment.utc().valueOf();
    await bot.models.lyricslog.findOneAndUpdate(
      {
        track_name: track.name,
        artist_name: track.artist.name,
      },
      {
        track_name: track.name,
        artist_name: track.artist.name,
        lyrics: original_lyrics,
        timestamp,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
    const embeds = [];
    for (const chunk of lyrics_chunks) {
      embeds.push(new EmbedBuilder().setDescription(chunk));
    }
    response.embeds = embeds;
    return response;
  },
};
