import { Message, MessageEmbed } from "discord.js";
import Command from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import BotMessage from "../../handlers/BotMessage";
import get_registered_users from "../../misc/get_registered_users";

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

  async run(client: CrownBot, message: Message, args: string[]) {
    if (!message.guild) return;
    const response = new BotMessage({ client, message, text: "", reply: true });
    const server_users = (await get_registered_users(client, message))?.users;
    if (!server_users) return;

    const crowns = await client.models.crowns
      .find({
        guildID: message.guild.id,
        userID: {
          $in: server_users.map((user) => user.database.userID),
        },
      })
      .lean();
    const amounts = new Map();
    crowns.forEach((x) => {
      if (amounts.has(x.userID)) {
        let amount = amounts.get(x.userID);
        amounts.set(x.userID, ++amount);
      } else {
        amounts.set(x.userID, 1);
      }
    });
    let num = 0;
    const entries = [...amounts.entries()];

    const description_text = entries

      .sort(([_, a], [__, b]) => b - a)
      .map(([userID, amount]) => {
        // yes, this monstrosity fetches GuildMember from the server.
        const discord_username = server_users.find(
          (user) => user.database.userID === userID
        )?.discord.user.username;

        return `${++num}. ${discord_username} with **${amount}** crowns`;
      })
      .join("\n");

    const embed = new MessageEmbed()
      .setTitle(`${message.guild.name}'s crown leaderboard`)
      .setDescription(description_text);

    const guild_icon = message.guild.iconURL();
    if (guild_icon) {
      embed.setThumbnail(guild_icon);
    }
    await message.channel.send(embed);
  }
}

export default CrownboardCommand;
