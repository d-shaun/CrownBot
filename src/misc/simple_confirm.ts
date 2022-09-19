import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";

// TODO: turn this into a class and add support for multiple/dynamic options

export default async function simple_confirm(
  title: string,
  option_one: string,
  option_two: string,
  interaction: GuildChatInteraction
) {
  const row = <ActionRowBuilder<ButtonBuilder>>(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("continue")
        .setLabel(option_one)
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel(option_two)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  await interaction.reply({
    content: "I think you should,",
    components: [row],
  });
}
