import { FieldsEmbed } from "discord-paginationembed";
import { Message, TextChannel, User } from "discord.js";
import Command from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
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

  async run(client: CrownBot, message: Message, args: string[]) {
    if (!message.guild) return;
    const response = new BotMessage({ client, message, text: "", reply: true });
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

    const crowns: CrownInterface[] = await client.models.crowns
      .find(<CrownInterface>{
        guildID: message.guild.id,
        userID: user.id,
      })
      .lean();

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

    const fields_embed = new FieldsEmbed()
      .setArray(sorted_crowns)
      .setAuthorizedUsers([])
      .setChannel(<TextChannel>message.channel)
      .setElementsPerPage(15)
      .setPageIndicator(true)
      .setDisabledNavigationEmojis(["delete"])
      .formatField(`Total: ${sorted_crowns.length} crowns`, (el: any) => {
        const elem: CrownInterface = el;
        const index =
          sorted_crowns.findIndex((e) => e.artistName === elem.artistName) + 1;
        return `${index}. ${esm(elem.artistName)} — **${
          elem.artistPlays
        } play(s)**`;
      });

    fields_embed.embed
      .setColor(message.member?.displayColor || "000000")
      .setTitle(`Crowns of ${user.username} in ${message.guild.name}`);
    fields_embed.on("start", () => {
      message.channel.stopTyping(true);
    });
    const avatar = user.avatarURL();
    if (avatar) {
      fields_embed.embed.setThumbnail(avatar);
    }
    await fields_embed.build();
  }
}

export default CrownsCommand;
