import { Client, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";

import moment from "moment";
import Lyricist from "lyricist";
import Track from "../handlers/LastFM_components/Track";
import { LyricsLogInterface } from "../models/LyricsLog";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("Get lyrics of a track")
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
    interaction: GuildChatInteraction
  ) {
    if (!bot.genius_api) {
      throw "You must set the `GENIUS_API` in the environment variable for this command to work.";
    }

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

    const query = await new Track({
      name: track_name,
      artist_name,
    }).get_info();

    if (query.lastfm_errorcode || !query.success) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
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
        await response.send_embeds(lyrics_chunks);
        return;
      }
    }

    const lyricist = new Lyricist(bot.genius_api);
    // TODO: Handle non-JSON response in Lyricist
    const song = (
      await lyricist.search(`${track.name} ${track.artist.name}`)
    )[0];
    if (!song) {
      response.text = "Couldn't find the song.";
      await response.send();
      return;
    }

    const song_info = await lyricist.song(song.id, { fetchLyrics: true });
    const original_lyrics = song_info.lyrics;
    if (!original_lyrics) {
      response.text = "Couldn't parse lyrics for the song.";
      await response.send();
      return;
    }
    const lyrics = `**${esm(song.title)}** by **${esm(
      song.primary_artist.name
    )}**\n\n${original_lyrics}`;
    if (lyrics.length > 6000) {
      response.text = "Couldn't find lyrics for the song.";
      await response.send();
      return;
    }
    const lyrics_chunks = toChunks(lyrics);
    if (!lyrics_chunks || !lyrics_chunks.length) {
      throw "toChunks() failed.";
    }

    await response.send_embeds(lyrics_chunks);

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
  },
};
