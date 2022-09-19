import {
  CommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import cb from "../misc/codeblock";
import esm from "../misc/escapemarkdown";
import CrownBot from "./CrownBot";

interface BotMessageInterface {
  bot: CrownBot;
  text?: string;
  interaction: CommandInteraction;
  noembed?: boolean;
  footer?: string;
}

class BotMessage {
  bot: CrownBot;
  interaction: CommandInteraction;
  text?: string;
  noembed: boolean;
  footer?: string;
  templates: { id: string; text: string }[];

  constructor({
    bot,
    interaction,
    text,
    noembed,
    footer,
  }: BotMessageInterface) {
    this.bot = bot;
    this.interaction = interaction;
    this.text = text;
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
          `please use the ${cb("/login")} command to set your username`,
      },
      {
        id: "already_logged",
        text: `You already are logged into the bot; 
      use ${cb("/me")} to see your username 
      and ${cb("/logout")} to logout.`,
      },
      {
        id: "lastfm_error",
        text: "Something went wrong while trying to fetch information from Last.fm.",
      },
      {
        id: "exception",
        text: `Something went wrong; please try again, and drop a note in the support server if this issue persists (see ${cb(
          "/support"
        )}).`,
      },
    ];
  }

  async send() {
    if (!this.text) throw "No 'text' to send.";

    const me = await this.interaction.guild?.members.fetchMe();
    let embed_permission = false;
    if (me) {
      const bot_permissions = (<TextChannel>(
        this.interaction.channel
      )).permissionsFor(me);

      embed_permission = bot_permissions?.has(PermissionFlagsBits.EmbedLinks);
    }
    if (!this.noembed && embed_permission) {
      const embed = new EmbedBuilder();
      embed.setDescription(`\n${this.text}\n`);
      if (this.footer) embed.setFooter({ text: this.footer });
      if (this.interaction.deferred) {
        return this.interaction.editReply({ embeds: [embed] });
      } else {
        return this.interaction.reply({ embeds: [embed] });
      }
    }
    if (this.interaction.deferred) {
      return this.interaction.editReply(`${this.text}`);
    } else {
      return this.interaction.reply(`${this.text}`);
    }
  }

  async error(id: string, lastfm_message?: string) {
    this.text = "";

    if (id === "blank") {
      this.text =
        lastfm_message; /* this is custom message so we don't escape markdown chars here */
      return this.send();
    }

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
