import {
  ActionRowBuilder,
  Client,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { exit } from "process";
import { inspect } from "util";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import CrownBot from "../handlers/CrownBot";
import edit_lyrics from "./owner_commands/editlyrics";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("managebot")
    .setDescription("Commands to manage the bot [ONLY FOR BOT OWNER]")
    .setDefaultMemberPermissions(0)
    .addSubcommand((option) =>
      option
        .setName("eval")
        .setDescription("Execute code on the bot [BOT OWNER ONLY!]")
        .addStringOption((option) =>
          option
            .setName("code")
            .setDescription("Code to execute")
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option
            .setName("hide_reply")
            .setDescription("Hide bot's reply")
            .setRequired(false)
        )
    )

    .addSubcommand((option) =>
      option
        .setName("shutdown")
        .setDescription("Gracefully shutdown the bot [BOT OWNER ONLY!]")
    )

    .addSubcommand((option) =>
      option
        .setName("editlyrics")
        .setDescription(
          "Edit lyrics of a song on the database [BOT OWNER ONLY!]"
        )
        .addStringOption((option) =>
          option
            .setName("track_name")
            .setDescription("Track Name")
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("artist_name")
            .setDescription("Artist Name")
            .setRequired(false)
        )
        .addBooleanOption((option) =>
          option
            .setName("hide_reply")
            .setDescription("Hide bot's reply")
            .setRequired(false)
        )
    )
    .addSubcommand((option) =>
      option
        .setName("config")
        .setDescription("Manage bot's config [BOT OWNER ONLY!]")
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction
  ) {
    const hide_reply =
      interaction.options.getBoolean("hide_reply", false) || false;

    // check if it's the bot owner
    if (interaction.user.id !== bot.owner_ID) {
      await interaction.reply({
        content:
          "The /managebot command and its sub-commands can only be used by the bot owner.",
        ephemeral: true,
      });
      return;
    }

    // config command
    if (interaction.options.getSubcommand() === "config") {
      const modal = new ModalBuilder()
        .setCustomId("configmodal")
        .setTitle("Bot config");

      const exception_log_channel = new TextInputBuilder()
        .setCustomId("exception_log_channel")
        .setLabel("Exception log channel")
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setValue(bot.botconfig?.exception_log_channel || "failed to fetch");

      const maintenance = new TextInputBuilder()
        .setCustomId("maintenance")
        .setLabel("Under maintenance (on/off)")
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setValue(bot.botconfig?.maintenance || "failed to fetch");

      const disabled = new TextInputBuilder()
        .setCustomId("disabled")
        .setLabel("Disabled (on/off)")
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
        .setValue(bot.botconfig?.disabled || "failed to fetch");

      const disabled_message = new TextInputBuilder()
        .setCustomId("disabled_message")
        .setLabel("Disabled message (if disabled is on)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setValue(bot.botconfig?.disabled_message || "");

      const first = new ActionRowBuilder<TextInputBuilder>().addComponents(
        exception_log_channel
      );
      const second = new ActionRowBuilder<TextInputBuilder>().addComponents(
        maintenance
      );
      const third = new ActionRowBuilder<TextInputBuilder>().addComponents(
        disabled
      );
      const fourth = new ActionRowBuilder<TextInputBuilder>().addComponents(
        disabled_message
      );

      modal.addComponents(first, second, third, fourth);

      await interaction.showModal(modal);
      return;
    }

    if (hide_reply) await interaction.deferReply({ ephemeral: true });
    else await interaction.deferReply({ ephemeral: false });

    // the EV(A/I)L command
    if (interaction.options.getSubcommand() === "eval") {
      const code = interaction.options.getString("code", true);
      let trimmed_string;
      try {
        let evaled = await eval(code);
        if (typeof evaled !== "string") {
          evaled = inspect(evaled);
        }
        trimmed_string = evaled.substring(0, 2000);
      } catch (e: any) {
        trimmed_string = (e.message ? e.message : e).substring(0, 2000);
      }

      await interaction.editReply("```JS\n" + trimmed_string + "```");
      return;
    }

    // editlyrics command
    if (interaction.options.getSubcommand() === "editlyrics") {
      await edit_lyrics(bot, interaction);
      return;
    }

    // shutdown command
    if (interaction.options.getSubcommand() === "shutdown") {
      try {
        const collectors = bot.cache.collectors.get();
        if (collectors.length) {
          await interaction.editReply(
            `Gracefully shutting down the bot... (Terminating **${collectors.length}** active collectors.)`
          );
          collectors.forEach((collector) => collector.emit("end"));
        } else {
          await interaction.editReply(
            "Gracefully shutting down the bot... (No active collectors.)"
          );
        }
      } catch (e) {
        // ignore any error and continue shutting down
        console.log(e);
      }
      // wait 3s and destroy the Client
      setTimeout(async () => {
        await interaction.editReply(
          "All active processes have been terminated. Bye!"
        );
        client.destroy();
        exit(0);
      }, 3000);
      return;
    }
  },
};
