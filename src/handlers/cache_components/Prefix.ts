import { Guild } from "discord.js";
import CrownBotClass from "../../classes/CrownBot";
import { CacheComponent } from "../../interfaces/CacheComponentInterface";
import { PrefixInterface } from "../../stable/models/Prefixes";
export class Prefix implements CacheComponent {
  #client: CrownBotClass;
  #prefixes: PrefixInterface[] | undefined = [];

  constructor(client: CrownBotClass) {
    this.#client = client;
  }

  async init() {
    const prefixes: any = await this.#client.models.prefixes.find().lean();
    this.#prefixes = prefixes;
    console.log(`initialized ${prefixes.length} prefix(es)`);

    return !!this.#prefixes;
  }

  async check() {
    return !!this.#prefixes;
  }

  get(guild: Guild | string) {
    if (!this.#prefixes) throw "Prefixes are not initialized";
    let guild_id: string;
    if (guild instanceof Guild) {
      guild_id = guild.id;
    } else {
      guild_id = guild;
    }

    const server_prefix = this.#prefixes.find((prefix) => {
      prefix.guildID === guild;
    });

    return server_prefix?.prefix || this.#client.prefix || "&";
  }

  set(new_prefix: string, guild: Guild | string) {
    if (!this.#prefixes) throw "Prefixes are not initialized";
    let guild_id: string;
    if (guild instanceof Guild) {
      guild_id = guild.id;
    } else {
      guild_id = guild;
    }
    let changed = false;
    this.#prefixes = this.#prefixes.map((prefix) => {
      if (prefix.guildID === guild_id) {
        prefix.prefix = new_prefix;
        changed = true;
      }

      return prefix;
    });
    return changed;
  }
}
