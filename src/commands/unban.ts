import { Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a previously banned user from the bot")
    .addUserOption((option) =>
      option
        .setName("discord_user")
        .setDescription("User to unban")
        .setRequired(true)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction
  ) {
    const response = new BotMessage({
      bot,
      interaction,
    });

    const has_permission = interaction.memberPermissions?.has(
      PermissionFlagsBits.BanMembers
    );

    if (!has_permission) {
      response.text =
        "You do not have the permission (``BAN_MEMBERS``) to execute this command.";
      await response.send();

      return;
    }
    const user = interaction.options.getUser("discord_user", true);

    const banned_user = await bot.models.bans.findOne({
      guildID: interaction.guild.id,
      userID: user.id,
    });
    if (!banned_user) {
      response.text = `\`${user.tag}\` isn't banned in this guild.`;
      await response.send();
      return;
    }

    if (await banned_user.remove()) {
      response.text = `\`${user.tag}\` has been unbanned.`;
    } else {
      response.text = new Template().get("exception");
    }

    await response.send();
  },
};
