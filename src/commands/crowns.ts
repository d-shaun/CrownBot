import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import esm from "../misc/escapemarkdown";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crowns")
    .setDescription("See the crowns you've obtained in a server")
    .addUserOption((option) =>
      option
        .setName("discord_user")
        .setDescription("User to see crowns of")
        .setRequired(false)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    const discord_user =
      interaction.options.getUser("discord_user") || interaction.user;

    const crowns = await bot.models.crowns.find({
      guildID: interaction.guild.id,
      userID: discord_user.id,
      whatever: "wh",
    });

    if (crowns.length <= 0) {
      response.text =
        "There are no crowns obtained under that username on this server.";

      return response;
    }

    const sorted_crowns = crowns.sort((a, b) => b.artistPlays - a.artistPlays);

    const embed = new EmbedBuilder()
      .setTitle(
        `Crowns of ${discord_user.username} in ${interaction.guild.name}`
      )
      .setDescription(`Total: **${sorted_crowns.length} crowns**`);

    const data_list = sorted_crowns.map((elem) => {
      return `${esm(elem.artistName)} — **${elem.artistPlays} play(s)**`;
    });
    response.paginate = true;
    response.paginate_embed = embed;
    response.paginate_data = data_list;
    response.paginate_numbering = true;

    return response;
  },
};
