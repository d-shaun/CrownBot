import { Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
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
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    const has_permission = interaction.memberPermissions?.has(
      PermissionFlagsBits.BanMembers
    );

    if (!has_permission) {
      response.text =
        "You do not have the permission (``BAN_MEMBERS``) to execute this command.";
      return response;
    }
    const user = interaction.options.getUser("discord_user", true);

    const banned_user = await bot.models.bans.findOne({
      guildID: interaction.guild.id,
      userID: user.id,
    });
    if (!banned_user) {
      response.text = `\`${user.tag}\` isn't banned in this guild.`;
      return response;
    }

    if (await banned_user.remove()) {
      response.text = `\`${user.tag}\` has been unbanned.`;
      return response;
    } else {
      return response.error("exception");
    }
  },
};
