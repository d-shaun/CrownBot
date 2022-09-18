import { pagination } from "@devraelfreeze/discordjs-pagination";
import { EmbedBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";

export default class Paginate {
  interaction: GuildChatInteraction;
  embed: EmbedBuilder;
  list: string[];
  elements: number;
  numbering: boolean;

  constructor(
    interaction: GuildChatInteraction,
    embed: EmbedBuilder,
    list: string[],
    elements = 15,
    numbering = true
  ) {
    this.interaction = interaction;
    this.embed = embed;
    this.list = list;
    this.elements = elements;
    this.numbering = numbering;
  }

  gen_list(elems: string[]) {
    return elems.map((e) => `\n${e}\n`);
  }

  chunk(arr: string[], len: number) {
    const chunks = [],
      n = arr.length;
    let i = 0;
    while (i < n) {
      chunks.push(arr.slice(i, (i += len)));
    }

    return chunks;
  }

  async send() {
    const embeds: EmbedBuilder[] = [];

    if (this.numbering) {
      this.list = this.list.map((item, i) => `${i + 1}. ${item}`);
    }
    const chunks = this.chunk(this.list, this.elements);

    chunks.forEach((chunk) => {
      const new_embed = new EmbedBuilder().setTitle(
        this.embed.data.title || "Embed"
      );

      let description = chunk.join("\n");
      if (this.embed.data.description) {
        description = this.embed.data.description + "\n\n" + description;
      }
      if (this.embed.data.footer?.text)
        new_embed.setFooter({ text: this.embed.data.footer.text });

      if (this.embed.data.footer?.text && chunks.length >= 2) {
        // no footer text if there's only one page
        description += "\n\n" + this.embed.data.footer.text;
      }
      new_embed.setDescription(description);

      embeds.push(new_embed);
    });

    if (chunks.length >= 2) {
      return await pagination({
        embeds: <any>embeds, // Array of embeds objects
        author: this.interaction.user,
        interaction: this.interaction,
        time: 60000, // 60 seconds
        disableButtons: true, // Remove buttons after timeout
        fastSkip: false,
        pageTravel: false,
      });
    } else {
      return this.interaction.editReply({ embeds: [embeds[0]] });
    }
  }
}
