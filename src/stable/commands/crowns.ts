import { MessageEmbed, User } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import Paginate from "../../handlers/Paginate";
import esm from "../../misc/escapemarkdown";
import search_user from "../../misc/search_user";
import { CrownInterface } from "../models/Crowns";

class CrownsCommand extends Command {
  constructor() {
    super({
      name: "crowns",
      description: "Displays crowns of a user.",
      usage: ["crowns", "crowns <username>", "crowns <@user>"],
      aliases: ["cw"],
      require_login: true,
      required_permissions: ["MANAGE_MESSAGES"],
      category: "userstat",
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const response = new BotMessage({ bot, message, text: "", reply: true });
    let user: User | undefined;
    let not_op = false;
    if (args.length > 0) {
      const mention = message.mentions.members?.first();
      user = mention ? mention.user : await search_user(message, args);
      not_op = true;
    } else {
      user = message.member ? message.member.user : undefined;
    }
    if (!user) {
      response.text = "User not found.";
      await response.send();
      return;
    }

    const crowns: CrownInterface[] = await bot.models.crowns.find(<
      CrownInterface
    >{
      guildID: message.guild.id,
      userID: user.id,
    });

    if (crowns.length <= 0) {
      if (!not_op) {
        response.text = "You don't have any crown in this server.";
      } else {
        response.text = "The user doesn't have any crown in this server.";
      }
      await response.send();
      return;
    }

    const sorted_crowns = crowns.sort((a, b) => b.artistPlays - a.artistPlays);

    const embed = new MessageEmbed()
      .setColor(message.member?.displayColor || 0x0)
      .setTitle(`Crowns of ${user.username} in ${message.guild.name}`)
      .setDescription(`Total: **${sorted_crowns.length} crowns**`);

    const data_list = sorted_crowns.map((elem) => {
      return `${esm(elem.artistName)} — **${elem.artistPlays} play(s)**`;
    });
    const paginate = new Paginate(message, embed, data_list);
    await paginate.send();
  }
}

export default CrownsCommand;
