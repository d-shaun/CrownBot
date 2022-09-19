import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
// import GuildCommandInteraction from "../classes/GuildCommandInteraction";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import Paginate from "../handlers/Paginate";
import esm from "../misc/escapemarkdown";
import { CrownInterface } from "../models/Crowns";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crowns")
    .setDescription("See your crowns on a server")
    .addUserOption((option) =>
      option
        .setName("discord_user")
        .setDescription("User to see crowns of")
        .setRequired(false)
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

    const discord_user =
      interaction.options.getUser("discord_user") || interaction.user;

    const crowns: CrownInterface[] = await bot.models.crowns.find(<
      CrownInterface
    >{
      guildID: interaction.guild.id,
      userID: discord_user.id,
    });

    if (crowns.length <= 0) {
      response.text =
        "There are no crowns obtained under that username on this server.";

      await response.send();
      return;
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
    const paginate = new Paginate(interaction, embed, data_list);
    await paginate.send();
  },
};
