import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";

import Lyricist from "lyricist";
import moment from "moment";
import { CommandResponse } from "../handlers/CommandResponse";
import Track from "../handlers/LastFM_components/Track";
import { LyricsLogInterface } from "../models/LyricsLog";

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
    if (!bot.genius_api) {
      throw "You must set the `GENIUS_API` in the environment variable for this command to work.";
    }

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

    const db_entry: LyricsLogInterface | null =
      await bot.models.lyricslog.findOne(<LyricsLogInterface>{
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

    const lyricist = new Lyricist(bot.genius_api);
    // TODO: Handle non-JSON response in Lyricist
    const song = (
      await lyricist.search(`${track.name} ${track.artist.name}`)
    )[0];
    if (!song) {
      response.text = "Couldn't find the song.";
      return response;
    }

    const song_info = await lyricist.song(song.id, { fetchLyrics: true });
    const original_lyrics = song_info.lyrics;
    if (!original_lyrics) {
      response.text = "Couldn't parse lyrics for the song.";
      return response;
    }
    const lyrics = `**${esm(song.title)}** by **${esm(
      song.primary_artist.name
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
      <LyricsLogInterface>{
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
