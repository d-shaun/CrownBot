import { Collectors } from "./cache_components/Collectors";
import { Config } from "./cache_components/Config";
import { ServerArtists } from "./cache_components/ServerArtists";
import CrownBot from "./CrownBot";

export default class CacheHandler {
  #bot: CrownBot;
  config: Config;
  serverartists: ServerArtists;
  collectors: Collectors;

  constructor(client: CrownBot) {
    this.#bot = client;
    this.config = new Config(this.#bot);
    this.serverartists = new ServerArtists(this.#bot);
    this.collectors = new Collectors();
  }
}
