import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import Track from "../../handlers/LastFM_components/Track";
import User from "../../handlers/LastFM_components/User";
import esm from "../../misc/escapemarkdown";
import { LyricsLogInterface } from "../../stable/models/LyricsLog";

class PurgeLyricsCommand extends Command {
  constructor() {
    super({
      name: "purgelyrics",
      description:
        "Purges cached lyrics for user's 'now-playing' (or explicitly specified) song.",
      usage: ["purgelyrics", "purgelyrics <query>"],
      aliases: [],
      require_login: true,
      hidden: true,
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

    let artist_name;
    let track_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(bot, message);
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
          response.text = `Couldn't find the track`;
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
    }).get_info();
    if (query.lastfm_errorcode || !query.success) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }
    const track = query.data.track;

    const db_entry: LyricsLogInterface = await bot.models.lyricslog.findOne({
      track_name: track.name,
      artist_name: track.artist.name,
      permanent: {
        $ne: true,
      },
    });
    if (db_entry) {
      const db_response = await bot.models.lyricslog.deleteOne({
        track_name: track.name,
        artist_name: track.artist.name,
        permanent: {
          $ne: true,
        },
      });
      if (db_response) {
        response.text = `Successfully purged the cached lyrics for **${esm(
          track.name
        )}** by **${esm(track.artist.name)}**.`;
      } else {
        response.text = new Template(bot, message).get("exception");
      }
      await response.send();
    } else {
      response.text = `Couldn't find cached lyrics for **${esm(
        track.name
      )}** by **${esm(track.artist.name)}**.`;
      await response.send();
    }
  }
}

export default PurgeLyricsCommand;
