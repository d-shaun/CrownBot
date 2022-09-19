import { Config } from "./cache_components/Config";
import { Prefix } from "./cache_components/Prefix";
import CrownBot from "./CrownBot";

export default class CacheHandler {
  #bot: CrownBot;
  config: Config;
  prefix: Prefix;

  constructor(client: CrownBot) {
    this.#bot = client;
    this.config = new Config(this.#bot);
    this.prefix = new Prefix(this.#bot);
  }
}
