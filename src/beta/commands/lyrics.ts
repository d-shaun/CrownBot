import Lyricist from "lyricist";
import moment from "moment";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import Track from "../../handlers/LastFM_components/Track";
import User from "../../handlers/LastFM_components/User";
import cb from "../../misc/codeblock";
import esm from "../../misc/escapemarkdown";
import { LyricsLogInterface } from "../../stable/models/LyricsLog";

class LyricsCommand extends Command {
  constructor() {
    super({
      name: "lyrics",
      description:
        "Shows lyrics for user's 'now-playing' (or explicitly specified) song.",
      usage: ["lyrics", "lyrics <query>"],
      aliases: ["lyric", "ly"],
      examples: ["lyrics Eternal Summer"],
      require_login: true,
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    if (!client.genius_api) {
      throw "You must set the `GENIUS_API` in the environment variable for this command to work.";
    }
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
            "help lyrics",
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

    const lyricist = new Lyricist(client.genius_api);
    const song = (
      await lyricist.search(`${track.name} ${track.artist.name}`)
    )[0];
    if (!song) {
      response.text = "Couldn't find the song.";
      await response.send();
      return;
    }

    const toChunks = (lyrics: string) => {
      return lyrics.match(/(.|[\r\n]){1,2000}/g);
    };

    const db_entry: LyricsLogInterface = await client.models.lyricslog.findOne({
      id: song.id,
    });
    if (db_entry) {
      let lyrics_chunks = toChunks(db_entry.lyrics);
      const title = `**${db_entry.track_name}** by **${db_entry.artist_name}**\n\n`;

      if (lyrics_chunks && lyrics_chunks.length) {
        lyrics_chunks = [title, ...lyrics_chunks];
        response.reply = false;
        for (const lyric of lyrics_chunks) {
          response.text = lyric;
          await response.send();
        }
        return;
      }
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
    response.reply = false;
    for (const lyric of lyrics_chunks) {
      response.text = lyric;
      await response.send();
    }
    const timestamp = moment.utc().valueOf();

    await client.models.lyricslog.findOneAndUpdate(
      {
        id: song.id,
      },
      <LyricsLogInterface>{
        id: song.id,
        track_name: song.title,
        artist_name: song.primary_artist.name,
        lyrics: original_lyrics,
        timestamp,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
  }
}

export default LyricsCommand;
