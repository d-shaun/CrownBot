import Command, { GuildMessage } from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import Artist from "../../handlers/LastFM_components/Artist";
import User from "../../handlers/LastFM_components/User";

class TrendingCommand extends Command {
  constructor() {
    super({
      name: "trending",
      description: "Displays artist's recent trending tracks on Last.fm.",
      usage: ["trending", "trending <artist name>"],
      aliases: ["tr"],
      examples: ["trending Devin Townsend"],
      require_login: true,
      category: "other",
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const db = new DB(bot.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    // const response = new BotMessage({ bot, message, reply: true });

    if (!user) return;
    const lastfm_user = new User({
      username: user.username,
    });

    let artist_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(bot, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
    } else {
      artist_name = args.join(" ");
    }

    const artist = new Artist({ name: artist_name });
    const trending = await artist.get_trending();
    if (!trending) {
      // TODD: error message here
      return;
    }

    console.log(trending);
  }
}

export default TrendingCommand;
