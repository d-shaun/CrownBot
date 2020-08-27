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
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    if (!message.guild) return;
    const response = new BotMessage({ client, message, text: "", reply: true });
    const banned_ids = (await get_registered_users(client, message))
      ?.banned_ids;

    if (!banned_ids) return;
    let crowns = await client.models.crowns
      .find({
        guildID: message.guild.id,
      })
      .lean();
    crowns = crowns.filter((crown) => !banned_ids.includes(crown.userID));

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
    const has_crowns = entries.findIndex(
      ([userID]) => userID === message.author.id
    );
    const author_pos = has_crowns ? has_crowns + 1 : null;
    const embed = new MessageEmbed()
      .setTitle(`${message.guild.name}'s crown leaderboard`)

      .setDescription(
        entries
          .filter(([userID]) => {
            // check if the user is still on the server
            return message.guild?.members.cache.get(userID) !== undefined;
          })
          .sort(([_, a], [__, b]) => b - a)
          .map(([userID, amount]) => {
            return `${++num}. ${
              message.guild?.members.cache.get(userID)?.user.username
            } with **${amount}** crowns`;
          })
          .join("\n")
      );

    const guild_icon = message.guild.iconURL();
    if (guild_icon) {
      embed.setThumbnail(guild_icon);
    }
    await message.channel.send(embed);
  }
}

export default CrownboardCommand;
