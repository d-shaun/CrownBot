import Lyricist from "lyricist";
import moment from "moment";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import User from "../../handlers/LastFM_components/User";
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

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    if (!bot.genius_api) {
      throw "You must set the `GENIUS_API` in the environment variable for this command to work.";
    }
    const db = new DB(bot.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;

    const response = new BotMessage({ bot, message, text: "", reply: true });
    const lastfm_user = new User({
      username: user.username,
    });

    let search_query;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(bot, message);
      if (!now_playing) return;
      const {
        name: track_name,
        artist: { "#text": artist_name },
      } = now_playing;

      search_query = `${track_name} ${artist_name}`;
    } else search_query = args.join(" ");

    const lyricist = new Lyricist(bot.genius_api);
    const song = (await lyricist.search(search_query))[0];
    if (!song) {
      response.text = "Couldn't find the song.";
      await response.send();
      return;
    }

    const toChunks = (lyrics: string) => {
      return lyrics.match(/(.|[\r\n]){1,2000}/g);
    };

    const db_entry: LyricsLogInterface = await bot.models.lyricslog.findOne({
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

    await bot.models.lyricslog.findOneAndUpdate(
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
