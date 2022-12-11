import { ButtonInteraction, InteractionCollector } from "discord.js";
import { CacheComponent } from "../../interfaces/CacheComponentInterface";

export class Collectors implements CacheComponent {
  entries: InteractionCollector<any>[] = [];

  async init() {
    // placeholder, not needed
    return true;
  }

  add(collector: InteractionCollector<ButtonInteraction>) {
    if (this.entries.length > 100) this.entries.length = 90;
    this.entries.unshift(collector);
  }
}
