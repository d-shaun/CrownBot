import CrownBotClass from "../classes/CrownBot";
import { Config } from "./cache_components/Config";
import { Prefix } from "./cache_components/Prefix";
import CrownBot from "./CrownBot";

export default class CacheHandler {
  #client: CrownBotClass;
  prefix: Prefix;
  config: Config;
  constructor(client: CrownBot) {
    this.#client = client;
    this.prefix = new Prefix(this.#client);
    this.config = new Config(this.#client);
  }
}
