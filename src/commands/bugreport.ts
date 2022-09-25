import {
  ActionRowBuilder,
  Client,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import CrownBot from "../handlers/CrownBot";

const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bugreport")
    .setDescription("Report a bug to the CrownBot maintainer via a form."),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction
  ) {
    const modal = new ModalBuilder()
      .setCustomId("bugmodal")
      .setTitle("Report a bug");

    const bug_message_input = new TextInputBuilder()
      .setCustomId("message")
      .setLabel("Please describe the bug in detail")
      .setRequired(true)
      .setStyle(TextInputStyle.Paragraph);

    const firstActionRow =
      new ActionRowBuilder<TextInputBuilder>().addComponents(bug_message_input);

    modal.addComponents(firstActionRow);
    await interaction.showModal(modal);
  },
};
