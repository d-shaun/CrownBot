import { Message, MessageButton, MessageEmbed } from "discord.js";
const paginationEmbed = require("discordjs-button-pagination");

export default class Paginate {
  message: Message;
  embed: MessageEmbed;
  list: string[];
  elements: number;
  numbering: boolean;

  constructor(
    message: Message,
    embed: MessageEmbed,
    list: string[],
    elements = 15,
    numbering = true
  ) {
    this.message = message;
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
    const embeds: MessageEmbed[] = [];

    if (this.numbering) {
      this.list = this.list.map((item, i) => `${i + 1}. ${item}`);
    }
    const chunks = this.chunk(this.list, this.elements);

    chunks.forEach((chunk, i) => {
      embeds[i] = Object.create(this.embed);
      let new_text = chunk.join("\n");
      if (this.embed.description) {
        new_text = `${this.embed.description}\n\n` + new_text;
      }
      embeds[i].description = new_text + "\n";
      if (this.embed.footer?.text && chunks.length >= 2) {
        // no footer text if there's only one page
        embeds[i].description += "\n" + this.embed.footer.text;
      }
    });

    const button1 = new MessageButton()
      .setCustomId("previousbtn")
      .setLabel("Previous")
      .setStyle("SUCCESS");

    const button2 = new MessageButton()
      .setCustomId("nextbtn")
      .setLabel("Next")
      .setStyle("SUCCESS");
    const buttonList = [button1, button2];

    if (chunks.length >= 2) {
      return paginationEmbed(this.message, embeds, buttonList, 60000);
    } else {
      return this.message.channel.send({ embeds: [embeds[0]] });
    }
  }
}
