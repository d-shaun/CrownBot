import { Artists } from "./cache_components/Artists";
import { Config } from "./cache_components/Config";
import CrownBot from "./CrownBot";

export default class CacheHandler {
  #bot: CrownBot;
  config: Config;
  artists: Artists;

  constructor(client: CrownBot) {
    this.#bot = client;
    this.config = new Config(this.#bot);
    this.artists = new Artists(this.#bot);
  }
}
