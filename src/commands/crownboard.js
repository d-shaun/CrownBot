const Command = require("../handler/Command");
const BotEmbed = require("../classes/BotEmbed");
const fs = require("fs");
const path = require("path");

class CrownsCommand extends Command {
  constructor() {
    super({
      name: "crownboard",
      description: "Displays the server's crown leaderboard.",
      usage: ["crownboard", "cb"],
      aliases: ["cb"]
    });
  }

  async run(client, message, args) {
    const crowns = await client.models.crowns.find({
      guildID: message.guild.id
    });
    const amounts = new Map();
    crowns.forEach(x => {
      if (amounts.has(x.userID)) {
        let amount = amounts.get(x.userID);
        amounts.set(x.userID, ++amount);
      } else {
        amounts.set(x.userID, 1);
      }
    });
    let num = 0;
    const entries = [...amounts.entries()];
    const hasCrowns = entries.findIndex(
      ([userID]) => userID === message.author.id
    );
    const authorPos = hasCrowns ? hasCrowns + 1 : null;
    const embed = new BotEmbed(message)
      .setTitle(`${message.guild.name}'s crown leaderboard`)
      .setThumbnail(message.guild.iconURL)
      .setDescription(
        entries
          .filter(([userID]) => {
            //check if the user is still on the server
            return message.guild.members.get(userID) !== undefined;
          })
          .sort(([_, a], [__, b]) => b - a)
          .map(([userID, amount]) => {
            return `${++num}. ${
              message.guild.members.get(userID).user.username
            } with **${amount}** crowns`;
          })
          .join("\n") 
      );
    await message.channel.send(embed);
  }
}

module.exports = CrownsCommand;
