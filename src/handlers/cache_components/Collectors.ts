import { ButtonInteraction, InteractionCollector } from "discord.js";
import { CacheComponent } from "../../interfaces/CacheComponentInterface";

export class Collectors implements CacheComponent {
  #entries: InteractionCollector<any>[] = [];

  async init() {
    // placeholder, not needed
    return true;
  }

  get() {
    return this.#entries;
  }

  add(collector: InteractionCollector<ButtonInteraction>) {
    // remove ended entries
    this.#entries = this.#entries.filter((e) => !e.ended);
    if (this.#entries.length > 100) this.#entries.length = 90;
    this.#entries.unshift(collector);
  }
}
