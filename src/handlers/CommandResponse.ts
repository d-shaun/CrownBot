import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonInteraction,
  ButtonStyle,
  Client,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import GLOBALS from "../../GLOBALS";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { ERRORID, Template } from "../classes/Template";
import esm from "../misc/escapemarkdown";
import { preflight_checks } from "./Command";
import CrownBot from "./CrownBot";
import Paginate from "./Paginate";
/**
 * Class that handles most of the commands' responses.
 */
export class CommandResponse {
  /**
   * Plain text to send
   */
  text?: string;

  /**
   * Title to set to the embed
   */
  title?: string;

  /**
   * Footer to set to the embed
   */
  footer?: string;

  /**
   * Author to set to the embed
   */
  author?: string;

  /**
   * Error code available in Template (priotized over everything else)
   */
  error_code?: ERRORID;

  /**
   *  Optional error message
   */
  error_message?: string;

  /**
   * Embed for paginator to use as base (for title, description, color...)
   */
  paginate_embed?: EmbedBuilder;

  /**
   * Number of elements to show per pagination
   */
  paginate_elements?: number;

  /**
   * Array of string elements to paginate
   */
  paginate_data?: string[];

  /**
   * Enable numbering on paginations (default: false)
   */
  paginate_numbering?: boolean;

  /**
   * Array of embeds to send
   */
  embeds?: EmbedBuilder[];

  /**
   * Array of embed components to attach to `embeds`
   */
  embed_components?: ActionRowBuilder<ButtonBuilder>[];

  /**
   * Custom filter for the collector to match
   */
  custom_filter?: (i: ButtonInteraction) => boolean;

  /**
   * Custom function to execute when Collector matches `custom_filter`
   */
  custom_hook?: (new_interaction: ButtonInteraction) => unknown;

  /**
   * Array of files to send along with `embeds`
   */
  files?: AttachmentBuilder[];

  bot: CrownBot;
  client: Client;
  interaction: any;

  /**
   * If values are set, it is sent as a follow up to the original message after execution.
   */
  follow_up: {
    text?: string;
    embeds?: EmbedBuilder[];
    embed_components?: ActionRowBuilder<ButtonBuilder>[];
    files?: AttachmentBuilder[];
    send_as_embed: boolean;
  } = { send_as_embed: true };

  // options
  custom_obj = {};

  /**
   * Allow this CommandResponse to be retried
   */
  allow_retry = false;

  /**
   * Send this message as a follow up
   */
  force_followup = false;

  /**
   * Indicates whether the command has fatally failed; if true, this message response is discarded and never sent
   */
  has_failed = false;

  /**
   * Send the plain-text `text` inside an embed (default: `true`)
   */
  send_as_embed = true;

  /**
   * Indicates whether this response is to be routed through Paginate and not sent as a "normal" message
   */
  paginate = false;

  constructor(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction | ButtonInteraction
  ) {
    this.bot = bot;
    this.client = client;
    this.interaction = interaction;
  }

  async reply() {
    if (this.has_failed) return;

    if (this.error_code) {
      if (this.error_code === "custom") {
        this.text = this.error_message;
        this.allow_retry = false;
        await this.#reply_text();
      } else {
        const template = new Template().get(this.error_code);
        this.text = template;
        if (this.error_message) {
          this.text += "\n\n>>> " + esm(this.error_message);
        }
        await this.#reply_text();
      }
      await this.bot.logger.log_error(this);
      return;
    }

    if (this.paginate && this.paginate_embed && this.paginate_data) {
      const paginate = new Paginate(
        this.interaction,
        this.paginate_embed,
        this.paginate_data,
        this.paginate_elements,
        this.paginate_numbering
      );
      await paginate.send();
    } else {
      // otherwise, just a normal text reply (with potential components and files)
      await this.#reply_text();
    }
    if (this.follow_up.text || this.follow_up.embeds || this.follow_up.files) {
      const { text, embeds, embed_components, files, send_as_embed } =
        this.follow_up;

      const follow_up_response = new CommandResponse(
        this.bot,
        this.client,
        this.interaction
      );
      follow_up_response.text = text;
      follow_up_response.embeds = embeds;
      follow_up_response.embed_components = embed_components;
      follow_up_response.files = files;
      follow_up_response.send_as_embed = send_as_embed;
      follow_up_response.force_followup = true;
      await follow_up_response.reply();
    }
  }

  // extra methods to make things ez-ier

  async #reply_text() {
    if (!this.text && !this.embeds?.length && !this.files?.length) return;
    const has_embed_perms = await this.check_embed_perms();
    if (!has_embed_perms) {
      // oh noo anyway....
      // TODO: add a message or something here idk im tired
      // maybe dont fuck up with the default bot permissions in the first place like a normal person smh
      return;
    }
    const components = [...(this.embed_components || [])];
    const embeds: EmbedBuilder[] = [];
    let plaintext = "";
    const random_id =
      "ret" +
      (Math.random().toString(36) + "00000000000000000").slice(2, 7 + 2);
    const buttonComps: ButtonBuilder[] = [];

    if (this.error_code) {
      if (this.error_code === "not_playing") {
        buttonComps.push(
          new ButtonBuilder()
            .setLabel("Need help?")
            .setStyle(ButtonStyle.Secondary)
            .setCustomId("scrobblingfaq")
        );
      }

      if (this.allow_retry) {
        buttonComps.unshift(
          new ButtonBuilder()
            .setLabel("Retry")
            .setStyle(ButtonStyle.Primary)
            .setCustomId(random_id)
        );
        this.#hook_retry_button(random_id);
      }
    }

    if (buttonComps.length) {
      const row = <ActionRowBuilder<ButtonBuilder>>(
        new ActionRowBuilder().addComponents(buttonComps)
      );
      components.push(row);
    }

    if (this.custom_filter && this.custom_hook) {
      this.#hook_custom_function();
    }

    if (this.text) {
      if (this.send_as_embed) {
        const embed = new EmbedBuilder();
        embed.setDescription(`\n${this.text}\n`);
        if (this.title) embed.setTitle(this.title);
        if (this.footer) embed.setFooter({ text: this.footer });
        embeds.push(embed);
      } else {
        plaintext = this.text;
      }
    }

    if (this.embeds?.length) {
      embeds.push(...this.embeds);
    }
    if (!this.interaction.deferred) {
      // initial reply
      return this.interaction.reply({
        content: plaintext,
        embeds,
        components,
        files: this.files || [],
      });
    } else if (this.force_followup) {
      // force follow-up to initial reply
      return this.interaction.followUp({
        content: plaintext,
        embeds,
        components,
        files: this.files || [],
      });
    } else {
      // edit initial reply
      return this.interaction.editReply({
        content: plaintext,
        embeds,
        components,
        files: this.files || [],
      });
    }
  }

  async #hook_custom_function() {
    const collector = this.interaction.channel.createMessageComponentCollector({
      filter: this.custom_filter,
      time: GLOBALS.RETRY_BUTTON_TIMEOUT,
    });

    collector.on("collect", this.custom_hook);
    collector.on("end", async () => {
      const sent_msg = await (<GuildChatInteraction>this.interaction)
        .fetchReply()
        .catch(() => {
          // oh no, anyway.
          // og message has been deleted by someone else.
        });

      if (sent_msg) {
        await (<GuildChatInteraction>this.interaction).editReply({
          components: [],
        });
      }
    });
  }

  async #hook_retry_button(random_id: string) {
    const filter = (i: ButtonInteraction) =>
      i.user.id === this.interaction.user.id && i.customId === random_id;

    const collector = this.interaction.channel.createMessageComponentCollector({
      filter,
      time: GLOBALS.RETRY_BUTTON_TIMEOUT,
    });

    collector.on("collect", async (new_interaction: ButtonInteraction) => {
      await (<GuildChatInteraction>this.interaction).editReply({
        components: [],
      });

      if (new_interaction.customId === random_id) {
        const command = this.bot.commands.find((e) => {
          return (
            e.data.name == (<GuildChatInteraction>this.interaction).commandName
          );
        });

        if (!command) return;

        try {
          const response = new CommandResponse(
            this.bot,
            this.client,
            <any>this.interaction
          );

          const embed = new EmbedBuilder().setDescription(
            "Retrying the previously failed command..."
          );

          await new_interaction.reply({ embeds: [embed] });
          const command_response = await preflight_checks(
            this.bot,
            this.client,
            <GuildChatInteraction>this.interaction,
            command,
            response
          );
          if (
            typeof command_response == "object" &&
            command_response instanceof CommandResponse
          ) {
            await command_response.reply();
          }
          await new_interaction.deleteReply();
        } catch (e: any) {
          console.error(e);
        }
      }
    });

    // remove the retry button (customId set in `random_id`)
    collector.on("end", async () => {
      const sent_msg = await (<GuildChatInteraction>this.interaction)
        .fetchReply()
        .catch(() => {
          // oh no, anyway.
          // og message has been deleted by someone else.
        });

      if (sent_msg) {
        const new_action_row = <ActionRowBuilder<ButtonBuilder>>(
          new ActionRowBuilder()
        );
        const { components: buttons } = sent_msg.components[0];

        buttons
          .filter((comp) => comp.customId !== random_id)
          .map((el) => {
            const comp = <ButtonComponent>el;
            if (!(comp.label && comp.style && comp.customId)) return;

            new_action_row.addComponents(
              new ButtonBuilder()
                .setLabel(comp.label)
                .setStyle(comp.style)
                .setCustomId(comp.customId)
            );
          });

        await (<GuildChatInteraction>this.interaction).editReply({
          components: [new_action_row],
        });
      }
    });
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

  /**
   * Set error code and error message to this response
   * @param error_code
   * @param error_message
   */
  error(error_code: ERRORID, error_message?: string) {
    this.error_code = error_code;
    this.error_message = error_message;
    return this;
  }

  /**
   * Set this response as failed and prevent any message (even `error`s) from being sent
   */
  fail() {
    this.has_failed = true;
    return this;
  }
}
