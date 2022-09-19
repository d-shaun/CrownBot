import { Config } from "./cache_components/Config";
import CrownBot from "./CrownBot";

export default class CacheHandler {
  #bot: CrownBot;
  config: Config;
  constructor(client: CrownBot) {
    this.#bot = client;
    this.config = new Config(this.#bot);
  }
}
