import { pagination } from "@devraelfreeze/discordjs-pagination";
import { EmbedBuilder } from "discord.js";
import GLOBALS from "../../GLOBALS";
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
    elements = GLOBALS.PAGINATE_ELEMENTS,
    numbering = false
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
      // eslint-disable-next-line no-irregular-whitespace
      this.list = this.list.map((item, i) => `${i + 1}.  ${item}`);
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

      new_embed.setDescription(description);

      embeds.push(new_embed);
    });

    if (chunks.length >= 2) {
      return await pagination({
        embeds: <any>embeds,
        author: this.interaction.user,
        interaction: this.interaction,
        time: GLOBALS.PAGINATE_TIMEOUT,
        disableButtons: true,
        fastSkip: false,
        pageTravel: false,
        customFilter: (interaction) =>
          parseInt((<any>interaction).customId) <= 4,
      });
    } else {
      return this.interaction.editReply({
        embeds: [embeds[0]],
        components: [],
      });
    }
  }
}
