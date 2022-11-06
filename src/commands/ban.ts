import { Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import cb from "../misc/codeblock";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription(
      "Ban a user from accessing the bot and showing up on various lists"
    )
    .addUserOption((option) =>
      option
        .setName("discord_user")
        .setDescription("User to ban")
        .setRequired(true)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    const db = new DB(bot.models);

    const has_permission = interaction.memberPermissions?.has(
      PermissionFlagsBits.BanMembers
    );

    if (!has_permission) {
      return response.error(
        "custom",
        "You do not have the permission (``BAN_MEMBERS``) to execute this command."
      );
    }
    const user = interaction.options.getUser("discord_user", true);

    const banned_user = await bot.models.bans.findOne({
      guildID: interaction.guild.id,
      userID: user.id,
    });
    if (banned_user) {
      response.text =
        `${cb(user.tag)} has already been banned on this server; ` +
        `looking for the ${cb("/unban")} command, maybe?`;
      return response;
    }

    if (await db.ban_user(interaction, user)) {
      response.text = `${cb(
        user.tag
      )} has been banned from accessing the bot and showing up on the 'whoknows' list.`;
      return response;
    } else {
      return response.error("exception");
    }
  },
};
