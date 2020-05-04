import { Client, Message, MessageEmbed } from "discord.js";

interface BotMessageInterface {
  client: Client;
  text: string;
  reply: boolean;
  message: Message;
  noembed?: boolean;
}

class BotMessage {
  client: Client;
  message: Message;
  text?: string;
  reply?: boolean;
  noembed?: boolean;

  constructor({ client, message, text, reply, noembed }: BotMessageInterface) {
    if (!message) {
      throw `The 'message' was not passed while trying to send the message: ${text}`;
    }
    this.client = client;
    this.message = message;
    this.text = text;
    this.reply = reply;
    this.noembed = noembed;
  }

  async send() {
    const mention = this.reply ? `<@${this.message.author.id}>: ` : "";
    if (!this.noembed) {
      const embed = new MessageEmbed();
      embed.setDescription(`\n${mention}${this.text}\n`);
      embed.setColor(this.message.member?.displayColor || "000000");
      return await this.message.channel.send(embed);
    }
    return await this.message.channel.send(`\n${mention}${this.text}\n`);
  }
}

export default BotMessage;
