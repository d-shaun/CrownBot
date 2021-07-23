import { Config } from "./cache_components/Config";
import { Prefix } from "./cache_components/Prefix";
import CrownBot from "./CrownBot";

export default class CacheHandler {
  #bot: CrownBot;
  prefix: Prefix;
  config: Config;
  constructor(client: CrownBot) {
    this.#bot = client;
    this.prefix = new Prefix(this.#bot);
    this.config = new Config(this.#bot);
  }
}
