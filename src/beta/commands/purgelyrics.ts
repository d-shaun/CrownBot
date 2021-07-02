import Lyricist from "lyricist";
import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
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

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    if (!client.genius_api) {
      throw "You must set the `GENIUS_API` in the environment variable for this command to work.";
    }
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;

    const response = new BotMessage({ client, message, text: "", reply: true });
    const lastfm_user = new User({
      username: user.username,
    });

    let search_query;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(client, message);
      if (!now_playing) return;
      const {
        name: track_name,
        artist: { "#text": artist_name },
      } = now_playing;

      search_query = `${track_name} ${artist_name}`;
    } else search_query = args.join(" ");

    const lyricist = new Lyricist(client.genius_api);
    const song = (await lyricist.search(search_query))[0];
    if (!song) {
      response.text = "Couldn't find the song.";
      await response.send();
      return;
    }

    const db_entry: LyricsLogInterface = await client.models.lyricslog.findOne({
      id: song.id,
    });
    if (db_entry) {
      const db_response = await client.models.lyricslog.deleteOne({
        id: song.id,
      });
      if (db_response) {
        response.text = `Successfully purged the cached lyrics for **${esm(
          song.title
        )}** by **${esm(song.primary_artist.name)}**.`;
      } else {
        response.text = new Template(client, message).get("exception");
      }
      await response.send();
    } else {
      response.text = `Couldn't find cached lyrics for **${esm(
        song.title
      )}** by **${esm(song.primary_artist.name)}**.`;
      await response.send();
    }
  }
}

export default PurgeLyricsCommand;
