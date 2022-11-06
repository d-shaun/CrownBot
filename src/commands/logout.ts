import { Client, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { Template } from "../classes/Template";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import cb from "../misc/codeblock";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("logout")
    .setDescription("Logs you out of the bot")
    .addBooleanOption((option) =>
      option
        .setName("global")
        .setDescription("Logout from the bot in all servers (globally)")
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    const db = new DB(bot.models);

    if (interaction.options.getBoolean("global")) {
      const user = await db.fetch_user(undefined, interaction.user.id, true);
      if (!user) {
        response.text = `You aren't logged into the bot in any server; use the ${cb(
          "/login"
        )} command to login.`;
        return response;
      }

      if (await db.remove_user(undefined, interaction.user.id, true)) {
        response.text = `You have been logged out from the bot globally.`;
      } else {
        response.text = new Template().get("exception");
      }
      return response;
    }

    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (!user) {
      response.text = `You aren't logged in; use the ${cb(
        "/login"
      )} command to login.`;
      return response;
    }

    if (await db.remove_user(interaction.guild.id, interaction.user.id)) {
      response.text = `You have been logged out from the bot in this server; use ${cb(
        "/logout true"
      )} to logout globally.`;
    } else {
      response.text = new Template().get("exception");
    }
    return response;
  },
};
