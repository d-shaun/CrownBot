import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonInteraction,
  ButtonStyle,
  Client,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { Template } from "../classes/Template";
import esm from "../misc/escapemarkdown";
import { preflight_checks } from "./Command";
import CrownBot from "./CrownBot";
import Paginate from "./Paginate";

export class CommandResponse {
  text?: string;
  follow_up?: string;
  footer?: string;
  author?: string;
  error_code?: string;
  error_message?: string;

  data?: any[];
  embed?: EmbedBuilder;

  bot: CrownBot;
  client: Client;
  interaction: any;

  // options
  custom_obj = {};
  allow_retry = false;
  force_followup = false;
  has_failed = false;
  send_as_embed = true;
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
        await this.#reply_text();
        return;
      }

      const template = new Template().get(this.error_code);
      this.text = template;
      if (this.error_message) {
        this.text += "\n\n>>> " + esm(this.error_message);
      }
      await this.#reply_text();
      return;
    }

    if (this.paginate && this.embed && this.data) {
      const paginate = new Paginate(
        this.interaction,
        this.embed,
        this.data,
        undefined,
        false
      );
      await paginate.send();
      if (this.follow_up) {
        this.text = this.follow_up;
        this.force_followup = true;
        await this.#reply_text();
      }
      return;
    }

    // otherwise, just a normal text reply
    await this.#reply_text();
  }

  // extra methods to make things ez-ier

  async #reply_text() {
    if (!this.text) return;
    const has_embed_perms = await this.check_embed_perms();
    if (!has_embed_perms) {
      // oh noo anyway....
      // TODO: add a message or something here idk im tired
      // maybe dont fuck up with the default bot permissions in the first place like a normal person smh
      return;
    }
    const embed = new EmbedBuilder();
    const components = [];
    const embeds: EmbedBuilder[] = [];
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
        this.hook_button_event(random_id);
      }
    }

    if (buttonComps.length) {
      const row = <ActionRowBuilder<ButtonBuilder>>(
        new ActionRowBuilder().addComponents(buttonComps)
      );
      components.push(row);
    }

    embed.setDescription(`\n${this.text}\n`);
    if (this.footer) embed.setFooter({ text: this.footer });

    embeds.push(embed);
    if (!this.interaction.deferred) {
      // initial reply
      return this.interaction.reply({ embeds, components });
    } else if (this.force_followup) {
      // force follow-up to initial reply
      return this.interaction.followUp({ embeds, components });
    } else {
      // edit initial reply
      return this.interaction.editReply({ embeds, components });
    }
  }

  async hook_button_event(random_id: string) {
    const filter = (i: ButtonInteraction) =>
      i.user.id === this.interaction.user.id && i.customId === random_id;

    const collector = this.interaction.channel.createMessageComponentCollector({
      filter,
      time: 600000, // 10 minutes
    });

    collector.on("collect", async (new_interaction: ButtonInteraction) => {
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

  fail() {
    this.has_failed = true;
    return this;
  }
}
