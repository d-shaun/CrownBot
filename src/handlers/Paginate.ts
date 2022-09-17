import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
const paginationEmbed = require("discordjs-button-pagination");

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

    chunks.forEach((chunk, i) => {
      embeds[i] = Object.create(this.embed);
      let new_text = chunk.join("\n");
      if (this.embed.data.description) {
        new_text = `${this.embed.data.description}\n\n` + new_text;
      }
      embeds[i].data.description = new_text + "\n";
      if (this.embed.data.footer?.text && chunks.length >= 2) {
        // no footer text if there's only one page
        embeds[i].data.description += "\n" + this.embed.data.footer.text;
      }
    });

    const button1 = new ButtonBuilder()
      .setCustomId("previousbtn")
      .setLabel("Previous")
      .setStyle(ButtonStyle.Success);

    const button2 = new ButtonBuilder()
      .setCustomId("nextbtn")
      .setLabel("Next")
      .setStyle(ButtonStyle.Success);
    const buttonList = [button1, button2];

    if (chunks.length >= 2) {
      return paginationEmbed(this.interaction, embeds, buttonList, 60000);
    } else {
      return this.interaction.editReply({ embeds: [embeds[0]] });
    }
  }
}
