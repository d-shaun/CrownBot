import { MessageEmbed, TextChannel } from "discord.js";
import { GuildMessage } from "../classes/Command";
import cb from "../misc/codeblock";
import esm from "../misc/escapemarkdown";
import CrownBot from "./CrownBot";

interface BotMessageInterface {
  client: CrownBot;
  text?: string;
  reply: boolean;
  message: GuildMessage;
  noembed?: boolean;
  footer?: string;
}

class BotMessage {
  client: CrownBot;
  message: GuildMessage;
  text?: string;
  reply: boolean;
  noembed: boolean;
  footer?: string;
  templates: { id: string; text: string }[];

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
    const server_prefix = client.cache.prefix.get(message.guild);
    this.client = client;
    this.message = message;
    this.text = text;
    this.reply = reply;
    this.noembed = noembed || false;
    this.footer = footer;

    // Error templates
    this.templates = [
      {
        id: "404_artist",
        text: "The bot was unable to find the artist.",
      },
      {
        id: "not_logged",
        text:
          `You are not logged into the bot in this server; ` +
          `please set your Last.fm username with the ` +
          `${cb("login", server_prefix)} commmand (see ${cb(
            "help login",
            server_prefix
          )}).`,
      },
      {
        id: "already_logged",
        text: `You already are logged into the bot; 
      send ${cb("me", server_prefix)} to see your username 
      and ${cb("logout", server_prefix)} to logout.`,
      },
      {
        id: "lastfm_error",
        text:
          "Something went wrong while trying to fetch information from Last.fm.",
      },
      {
        id: "exception",
        text: `Something went wrong; please try again, and drop a note in the support server if this issue persists (see ${cb(
          "support",
          server_prefix
        )}).`,
      },
    ];
  }

  async send() {
    if (!this.text) throw "No 'text' to send.";
    const mention = this.reply ? `<@${this.message.author.id}>: ` : "";
    if (!this.message.guild || !this.message.guild.me) {
      return this.message.channel.send(`${mention}${this.text}`);
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

      return this.message.channel.send(embed);
    }
    return this.message.channel.send(`${mention}${this.text}`);
  }

  async error(id: string, lastfm_message?: string) {
    const template = this.templates.find((t) => t.id === id);
    if (!template) {
      throw "No template with the ID found: " + id;
    }
    this.text = template.text;
    if (lastfm_message) {
      this.text += "\n\n>>> " + esm(lastfm_message);
    }
    return this.send();
  }
}

export default BotMessage;
