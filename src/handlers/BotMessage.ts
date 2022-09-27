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

  async check_embed_perms() {
    const me = await this.interaction.guild?.members.fetchMe();
    let embed_permission = false;
    if (me) {
      const bot_permissions = (<TextChannel>(
        this.interaction.channel
      )).permissionsFor(me);

      embed_permission = bot_permissions?.has(PermissionFlagsBits.EmbedLinks);
    }
    return embed_permission;
  }

  async send(force_follow_up = false) {
    if (!this.text) throw "No 'text' to send.";
    const has_embed_perms = await this.check_embed_perms();

    if (!this.noembed && has_embed_perms) {
      const embed = new EmbedBuilder();
      embed.setDescription(`\n${this.text}\n`);
      if (this.footer) embed.setFooter({ text: this.footer });

      if (!this.interaction.deferred) {
        // initial reply
        return this.interaction.reply({ embeds: [embed] });
      } else if (force_follow_up) {
        // force follow-up to initial reply
        return this.interaction.followUp({ embeds: [embed] });
      } else {
        // edit initial reply
        return this.interaction.editReply({ embeds: [embed] });
      }
    }

    if (!this.interaction.deferred) {
      // initial reply
      return this.interaction.reply(`${this.text}`);
    } else if (force_follow_up) {
      // force follow-up to initial reply
      return this.interaction.followUp(`${this.text}`);
    } else {
      // edit initial reply
      return this.interaction.editReply(`${this.text}`);
    }
  }

  async send_embeds(chunks: string[]) {
    const has_embed_perms = await this.check_embed_perms();
    if (!has_embed_perms) {
      await this.interaction.editReply(
        "Please grant the bot permission to send embeds. (Contact support server for help: /about)"
      );
      return;
    }
    const embeds = [];

    for (const chunk of chunks) {
      embeds.push(new EmbedBuilder().setDescription(chunk));
    }

    if (!this.interaction.deferred) {
      // initial reply
      return this.interaction.reply({ embeds });
    } else {
      // edit initial reply
      return this.interaction.editReply({ embeds });
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
