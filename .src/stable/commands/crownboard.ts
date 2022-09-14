import { EmbedBuilder } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import Paginate from "../../handlers/Paginate";
import get_registered_users from "../../misc/get_registered_users";
import { CrownInterface } from "../models/Crowns";
interface CrownStat {
  username: string;
  lastfm_username: string;
  userID: string;
  count: number;
}

class CrownboardCommand extends Command {
  constructor() {
    super({
      name: "crownboard",
      description: "Displays the server's crown leaderboard.",
      usage: ["crownboard", "cb"],
      aliases: ["cb"],
      category: "serverstat",
    });
  }

  async run(bot: CrownBot, message: GuildMessage) {
    const server_users = (await get_registered_users(bot, message))?.users;
    if (!server_users) return;

    const crowns: CrownInterface[] = await bot.models.crowns.find({
      guildID: message.guild.id,
      userID: {
        $in: server_users.map((user) => user.database.userID),
      },
    });

    // TODO: Log crownboard entries to show differences over time

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

    const embed = new EmbedBuilder()
      .setTitle(`Crown leaderboard`)
      .setColor(message.member?.displayColor || 0x0);

    if (!counts.length) {
      embed.setDescription(
        "Nobody has acquired any crown in this server; try using the `whoknows` command."
      );
      await message.channel.send({ embeds: [embed] });
      return;
    }

    const data_list = counts.map((user) => {
      return `**${user.username}** — **${user.count}** crowns`;
    });

    const paginate = new Paginate(message, embed, data_list);
    await paginate.send();
  }
}

export default CrownboardCommand;
