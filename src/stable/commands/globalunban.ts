import { Message } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import BotMessage from "../../handlers/BotMessage";

class GlobalUnbanCommand extends Command {
  constructor() {
    super({
      name: "globalunban",
      description: "Globally unban without affecting per-guild ban.",
      usage: ["globalunban <@user>"],
      aliases: ["gubn", "gub"],
      hidden: true,
      owner_only: true,
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = client.cache.prefix.get(message.guild);
    const db = new DB(client.models);

    if (!message.guild) return;
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });

    let userID;
    let mentioned = message.mentions.members?.first()?.user;
    if (!mentioned) {
      if (args.length === 0) {
        response.text = "No user ID provided.";
        await response.send();
        return;
      } else {
        userID = args.join().trim();
      }
    } else {
      userID = mentioned.id;
    }
    if (!userID) throw "HOW!?";

    if (
      !(await client.models.bans.findOne({
        userID,
        guildID: "any",
      }))
    ) {
      response.text = `\`${userID}\` isn't globally banned.`;
      await response.send();
      return;
    }

    const unbanned = await client.models.bans.deleteOne({
      userID,
      guildID: "any",
    });
    if (unbanned) {
      response.text = `Global ban entry deleted for \`${userID}\`.`;
    } else {
      response.text = `Something went wrong.`;
    }
    await response.send();
  }
}

export default GlobalUnbanCommand;
