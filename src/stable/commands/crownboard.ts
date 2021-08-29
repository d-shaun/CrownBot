import { MessageEmbed } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import User from "../../handlers/LastFM_components/User";
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

  async run(client: CrownBot, message: GuildMessage) {
    const server_users = (await get_registered_users(client, message))?.users;
    if (!server_users) return;

    const crowns: CrownInterface[] = await client.models.crowns.find({
      guildID: message.guild.id,
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

    const embed = new MessageEmbed().setTitle(`Crown leaderboard`);
    counts.push({
      lastfm_username: "heheboi",
      count: 1,
      username: "mlem",
      userID: "391201",
    });
    if (!counts.length) {
      embed.setDescription(
        "Nobody has acquired any crown in this server; try using the `whoknows` command."
      );
      await message.channel.send(embed);
      return;
    }

    if (counts.length > 15) {
      counts.length = 15;
    }

    let description_text = "";
    let counter = 0;
    for await (const user of counts) {
      if (counter == 0) {
        const lfm_user = new User({ username: user.lastfm_username });
        const user_stat = await lfm_user.get_stats("ALL");
        let extra_text = "";
        if (user_stat) {
          extra_text = `\n└ **${user_stat.artists}** artists · avg. **${user_stat.average_per_day}** scrobbles/day`;
        }
        embed.addField(
          "Top user",
          `⭐ **${user.username}** — **${user.count}** crowns ${extra_text}`
        );
      } else {
        description_text += `${counter + 1}. **${user.username}** — **${
          user.count
        }** crowns\n`;
      }

      counter++;
    }

    if (description_text) {
      embed.addField("\u200b", description_text);
    }

    await message.channel.send(embed);
  }
}

export default CrownboardCommand;
