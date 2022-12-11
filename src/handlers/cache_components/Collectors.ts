import { ButtonInteraction, InteractionCollector } from "discord.js";
import { CacheComponent } from "../../interfaces/CacheComponentInterface";

export class Collectors implements CacheComponent {
  entries: InteractionCollector<any>[] = [];

  async init() {
    // placeholder, not needed
    return true;
  }

  async add(collector: InteractionCollector<ButtonInteraction>) {
    this.entries.push(collector);
  }
}
