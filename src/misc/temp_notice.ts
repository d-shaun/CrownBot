import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
} from "discord.js";
import CrownBot from "../handlers/CrownBot";

export default async function send_temp_notice(
  message: Message,
  bot: CrownBot
) {
  if (!message.guild) return;
  const server_prefix = bot.cache.prefix.get(message.guild);
  if (!message.content.startsWith(server_prefix)) return;
  const embed = new EmbedBuilder()
    .setTitle("CrownBot now supports slash commands")
    .setDescription(
      "CrownBot is currently transitioning into using slash commands, replacing the old `<prefix>Command` system.\n\n" +
        "Despite the slash-command interface being clumsy, slow, and awkward, Discord is **forcing** __all bots__ (except for bots with special use-cases) to use slash commands.\n\n" +
        "CrownBot currently has the 'grace period' enabled to read message content __just to send this notice__, which is available until **October 1, 2022**. While on the 'grace period', the bot wont be allowed to join new servers.\n\n" +
        "The transition is still a work-in-progress and not all commands have been migrated.\n" +
        "If you encounter a bug or have anything to say about the bot in general, please use the `/reportbug` command or join the support server.\n\n" +
        "**Please keep in mind the only reason CrownBot switched to slash commands is to quite literally keep the bot running.**"
    );

  const row = <ActionRowBuilder<ButtonBuilder>>(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Join support server")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/4vU6kGhejv")
    )
  );
  await message.reply({ embeds: [embed], components: [row] });
}
