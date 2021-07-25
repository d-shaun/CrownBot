import { MessageReaction, User } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import cb from "../../misc/codeblock";

class LogoutCommand extends Command {
  constructor() {
    super({
      name: "logout",
      description: "Logs user out of the bot.",
      usage: ["logout", "logout global"],
      aliases: [],
      required_permissions: ["MANAGE_MESSAGES"],
      category: "setup",
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const prefix = bot.cache.prefix.get(message.guild);
    const db = new DB(bot.models);

    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });

    if (args[0] === "global") {
      const user = await db.fetch_user(undefined, message.author.id, true);
      if (!user) {
        response.text = `You aren't logged into the bot in any server; use the ${cb(
          "login",
          prefix
        )} command to login.`;
        await response.send();
        return;
      }

      if (await db.remove_user(undefined, message.author.id, true)) {
        response.text = `You have been logged out from the bot globally.`;
      } else {
        response.text = new Template(bot, message).get("exception");
      }
      await response.send();
      return;
    } else if (args[0]) {
      response.text = `Invalid argument passed; see ${cb(
        "help logout",
        prefix
      )}.`;
      await response.send();
      return;
    }

    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) {
      response.text = `You aren't logged in; use the ${cb(
        "login",
        prefix
      )} command to login.`;
      await response.send();
      return;
    }

    const msg = await new BotMessage({
      bot,
      message,
      text: "Are you sure you want to logout from the bot in this server? Click on the reaction to continue.",
      reply: true,
    }).send();
    await msg.react("✅");
    const filter = (reaction: MessageReaction, user: User) => {
      return reaction.emoji.name === "✅" && user.id === message.author.id;
    };

    const reactions = await msg.awaitReactions({ filter, time: 3000, max: 1 });

    const message_exists = message.channel.messages.cache.get(msg.id);
    if (message_exists) msg.delete();
    if (reactions.size > 0) {
      if (await db.remove_user(message.guild.id, message.author.id)) {
        response.text = `You have been logged out from the bot in this server; run ${cb(
          "logout global",
          prefix
        )} to logout globally.`;
      } else {
        response.text = new Template(bot, message).get("exception");
      }
      await response.send();
    } else {
      response.text = "Reaction wasn't clicked; no changes are made.";
      await response.send();
    }
  }
}

export default LogoutCommand;
