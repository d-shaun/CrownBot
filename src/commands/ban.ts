import { Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
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
    interaction: GuildChatInteraction
  ) {
    const db = new DB(bot.models);

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
    if (banned_user) {
      response.text =
        `${cb(user.tag)} has already been banned on this server; ` +
        `looking for the ${cb("/unban")} command, maybe?`;
      await response.send();
      return;
    }

    if (await db.ban_user(interaction, user)) {
      response.text = `${cb(
        user.tag
      )} has been banned from accessing the bot and showing up on the 'whoknows' list.`;
    } else {
      response.text = new Template().get("exception");
    }

    await response.send();
  },
};
