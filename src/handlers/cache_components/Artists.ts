import { Guild } from "discord.js";
import { CacheComponent } from "../../interfaces/CacheComponentInterface";
import CrownBot from "../CrownBot";

interface ServerArtists {
  guild_id: string;
  artists: string[];
}

export class Artists implements CacheComponent {
  #bot: CrownBot;
  #server_artists: ServerArtists[] = [];

  constructor(bot: CrownBot) {
    this.#bot = bot;
  }

  async init() {
    // placeholder, not needed
    return true;
  }

  async check() {
    return !!this.#server_artists;
  }

  async get(guild: Guild | string) {
    let guild_id: string;
    if (guild instanceof Guild) {
      guild_id = guild.id;
    } else {
      guild_id = guild;
    }

    let cached = this.#server_artists.find((entry) => {
      return entry.guild_id === guild_id;
    });
    if (!cached) {
      await this.set(guild_id);
    }

    cached = this.#server_artists.find((entry) => {
      return entry.guild_id === guild_id;
    });

    return cached;
  }

  async set(guild: Guild | string) {
    let guild_id: string;
    if (guild instanceof Guild) {
      guild_id = guild.id;
    } else {
      guild_id = guild;
    }

    const db_server_artists = await this.#bot.models.whoknowslog
      .find({
        guild_id: guild_id,
      })
      .sort({
        listener: "desc",
      })
      .limit(2000)
      .lean();

    const top_artists: string[] = db_server_artists.map((e) => e.artist_name);

    const cached = this.#server_artists.find((entry) => {
      return entry.guild_id === guild_id;
    });

    if (cached) {
      cached.artists = top_artists;
    } else {
      this.#server_artists.push({ guild_id: guild_id, artists: top_artists });
    }

    return true;
  }
}
