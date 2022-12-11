import { Guild } from "discord.js";
import { CacheComponent } from "../../interfaces/CacheComponentInterface";
import { GetReturnType } from "../../models/DBModels";
import CrownBot from "../CrownBot";

export class ServerArtists implements CacheComponent {
  #bot: CrownBot;
  #entries: {
    guild_id: string;
    artists: string[];
  }[] = [];

  constructor(bot: CrownBot) {
    this.#bot = bot;
  }

  async init() {
    // placeholder, not needed
    return true;
  }

  async check() {
    return !!this.#entries;
  }

  async get(guild: Guild | string) {
    let guild_id: string;
    if (guild instanceof Guild) {
      guild_id = guild.id;
    } else {
      guild_id = guild;
    }

    let cached = this.#entries.find((entry) => {
      return entry.guild_id === guild_id;
    });
    if (!cached) {
      await this.set(guild_id);
    }

    cached = this.#entries.find((entry) => {
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

    const db_server_artists: GetReturnType<"whoknowslog">[] =
      await this.#bot.models.whoknowslog
        .find({
          guild_id: guild_id,
        })
        // @ts-ignore
        .sort({
          listener: "desc",
        })
        .limit(2000);

    const top_artists = db_server_artists.map((e) => e.artist_name);

    const cached = this.#entries.find((entry) => {
      return entry.guild_id === guild_id;
    });

    if (cached) {
      cached.artists = top_artists;
    } else {
      this.#entries.push({ guild_id: guild_id, artists: top_artists });
    }

    return true;
  }
}
