import { Guild } from "discord.js";
import CrownBotClass from "../../classes/CrownBot";
import { CacheComponent } from "../../interfaces/CacheComponentInterface";
import { ServerConfigInterface } from "../../stable/models/ServerConfig";
export class Config implements CacheComponent {
  #client: CrownBotClass;
  #configs: ServerConfigInterface[] | undefined = [];

  constructor(client: CrownBotClass) {
    this.#client = client;
  }

  async init() {
    const configs: any = await this.#client.models.serverconfig.find().lean();
    this.#configs = configs;
    console.log(`initialized ${configs.length} config(s)`);

    return !!this.#configs;
  }

  async check() {
    return !!this.#configs;
  }

  get(guild: Guild | string) {
    if (!this.#configs) throw "Configs are not initialized";
    let guild_id: string;
    if (guild instanceof Guild) {
      guild_id = guild.id;
    } else {
      guild_id = guild;
    }
    const server_config = this.#configs.find((config) => {
      return config.guild_ID === guild_id;
    });
    return server_config;
  }

  set(new_config: ServerConfigInterface, guild: Guild | string) {
    if (!this.#configs) throw "Configs are not initialized";

    let guild_id: string;
    if (guild instanceof Guild) {
      guild_id = guild.id;
    } else {
      guild_id = guild;
    }
    let changed = false;
    this.#configs = this.#configs.map((config) => {
      if (config.guild_ID === guild_id) {
        changed = true;
        return { ...config, ...new_config };
      }

      return config;
    });
    return changed;
  }
}
