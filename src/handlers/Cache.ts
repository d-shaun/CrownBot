import { ServerArtists } from "./cache_components/ServerArtists";
import { Config } from "./cache_components/Config";
import CrownBot from "./CrownBot";

export default class CacheHandler {
  #bot: CrownBot;
  config: Config;
  serverartists: ServerArtists;

  constructor(client: CrownBot) {
    this.#bot = client;
    this.config = new Config(this.#bot);
    this.serverartists = new ServerArtists(this.#bot);
  }
}
