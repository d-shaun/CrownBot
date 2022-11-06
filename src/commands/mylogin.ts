import { Client, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import esm from "../misc/escapemarkdown";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mylogin")
    .setDescription("Displays your Last.fm username that is set on this bot"),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    const db = new DB(bot.models);
    const discord_user = interaction.user;

    const user = await db.fetch_user(interaction.guild.id, discord_user.id);
    if (!user) {
      return response.error("custom", "User is not logged in");
    }

    response.text = `Your Last.fm username is **${esm(
      user.username
    )}** ([visit](https://last.fm/user/${user.username})).`;
    return response;
  },
};
