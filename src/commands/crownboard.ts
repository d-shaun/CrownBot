import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import CrownBot from "../handlers/CrownBot";
import Paginate from "../handlers/Paginate";
import get_registered_users from "../misc/get_registered_users";
import { CrownInterface } from "../models/Crowns";
interface CrownStat {
  username: string;
  lastfm_username: string;
  userID: string;
  count: number;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crownboard")
    .setDescription("See the server's crown leaderboard"),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction
  ) {
    const server_users = (await get_registered_users(bot, interaction))?.users;
    if (!server_users) return;

    const crowns: CrownInterface[] = await bot.models.crowns.find({
      guildID: interaction.guild.id,
      userID: {
        $in: server_users.map((user) => user.database.userID),
      },
    });

    const counts = crowns
      .reduce((acc, cur) => {
        let stat = acc.find((cnt) => cnt.userID === cur.userID);
        const discord_user = server_users.find((user) => {
          return user.database.userID === cur.userID;
        });
        if (!discord_user)
          throw "User fetched from 'get_registered_user' is not found again (?)";
        if (!stat) {
          stat = {
            username: discord_user.discord.user.username,
            lastfm_username: cur.lastfm_username,
            userID: cur.userID,
            count: 1,
          };
          acc.push(stat);
        } else {
          stat.count++;
        }
        return acc;
      }, [] as CrownStat[])
      .sort((a, b) => b.count - a.count);

    const embed = new EmbedBuilder().setTitle(`Crown leaderboard`);

    if (!counts.length) {
      embed.setDescription(
        "Nobody has acquired any crown in this server; try using the `whoknows` command."
      );
      await interaction.channel.send({ embeds: [embed] });
      return;
    }

    const data_list = counts.map((user) => {
      return `**${user.username}** — **${user.count}** crowns`;
    });

    const paginate = new Paginate(interaction, embed, data_list);
    await paginate.send();
  },
};
