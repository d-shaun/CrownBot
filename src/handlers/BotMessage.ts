import { Client, Message, MessageEmbed, TextChannel } from "discord.js";

interface BotMessageInterface {
  client: Client;
  text: string;
  reply: boolean;
  message: Message;
  noembed?: boolean;
  footer?: string;
}

class BotMessage {
  client: Client;
  message: Message;
  text?: string;
  reply?: boolean;
  noembed?: boolean;
  footer?: string;

  constructor({
    client,
    message,
    text,
    reply,
    noembed,
    footer,
  }: BotMessageInterface) {
    if (!message) {
      throw `The 'message' was not passed while trying to send the message: ${text}`;
    }
    this.client = client;
    this.message = message;
    this.text = text;
    this.reply = reply;
    this.noembed = noembed;
    this.footer = footer;
  }

  async send() {
    const mention = this.reply ? `<@${this.message.author.id}>: ` : "";
    if (!this.message.guild || !this.message.guild.me) {
      return await this.message.channel.send(`${mention}${this.text}`);
    }

    const bot_permissions = (<TextChannel>this.message.channel).permissionsFor(
      this.message.guild.me
    );

    const embed_permission = bot_permissions?.has("EMBED_LINKS");
    if (!this.noembed && embed_permission) {
      const embed = new MessageEmbed();
      embed.setDescription(`\n${mention}${this.text}\n`);
      embed.setColor(this.message.member?.displayColor || "000000");
      if (this.footer) embed.setFooter(this.footer);

      return await this.message.channel.send(embed);
    }
    return await this.message.channel.send(`${mention}${this.text}`);
  }
}

export default BotMessage;
