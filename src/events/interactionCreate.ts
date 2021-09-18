import { Client, SelectMenuInteraction } from "discord.js";
import CrownBot from "../handlers/CrownBot";
import { help_navigate } from "../stable/commands/help";
export default async (
  bot: CrownBot,
  client: Client,
  interaction: SelectMenuInteraction
) => {
  if (!interaction.isSelectMenu()) return;
  switch (interaction.customId) {
    case "help_menu" + bot.buttons_version:
      help_navigate(bot, interaction);
      break;
  }
};
