import { Message } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import BotMessage from "../../handlers/BotMessage";

class GlobalBanCommand extends Command {
  constructor() {
    super({
      name: "globalban",
      description:
        "Globally ban a user from accessing the bot and showing up on the 'whoknows' list.",
      usage: ["globalban <@user>"],
      aliases: ["gban", "gb", "gbn"],
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
      await client.models.bans.findOne({
        userID,
        guildID: "any",
      })
    ) {
      response.text = `\`${userID}\` has already been globally banned.`;
      await response.send();
      return;
    }

    await client.models.bans.findOneAndUpdate(
      {
        userID,
        guildID: "any",
      },
      {
        userID,
        guildID: "any",
        guildName: "-globally blocked-",
        executor: message.author.tag,
        username: null,
      },
      {
        upsert: true,
        // @ts-ignore
        useFindAndModify: false,
      }
    );
    response.text = `\`${userID}\` has been globally banned.`;

    await response.send();
  }
}

export default GlobalBanCommand;
