import CrownBotClass from "../classes/CrownBot";
import { Prefix } from "./cache_components/Prefix";
import CrownBot from "./CrownBot";

export default class CacheHandler {
  #client: CrownBotClass;
  prefix: Prefix;
  constructor(client: CrownBot) {
    this.#client = client;
    this.prefix = new Prefix(client);
  }
}
