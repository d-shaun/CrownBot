import { Message, MessageReaction, User } from "discord.js";
import Command from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import BotMessage from "../../handlers/BotMessage";
import cb from "../../misc/codeblock";
import { Template } from "../../classes/Template";

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

  async run(client: CrownBot, message: Message, args: string[]) {
    const prefix = client.get_cached_prefix(message);
    const db = new DB(client.models);

    const response = new BotMessage({
      client,
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
        response.text = new Template(client, message).get("exception");
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

    const user = await db.fetch_user(message.guild?.id, message.author.id);
    if (!user) {
      response.text = `You aren't logged in; use the ${cb(
        "login",
        prefix
      )} command to login.`;
      await response.send();
      return;
    }

    const msg = await new BotMessage({
      client,
      message,
      text:
        "Are you sure you want to logout from the bot in this server? Click on the reaction to continue.",
      reply: true,
    }).send();
    await msg.react("✅");

    const reactions = await msg.awaitReactions(
      (reaction: MessageReaction, user: User) => {
        return reaction.emoji.name === "✅" && user.id === message.author.id;
      },
      {
        max: 1,
        time: 30000,
      }
    );
    msg.delete();
    if (reactions.size > 0) {
      if (await db.remove_user(message.guild?.id, message.author.id)) {
        response.text = `You have been logged out from the bot in this server; run ${cb(
          "logout global",
          prefix
        )} to logout globally.`;
      } else {
        response.text = new Template(client, message).get("exception");
      }
      await response.send();
    } else {
      response.text = "Reaction wasn't clicked; no changes are made.";
      await response.send();
    }
  }
}

export default LogoutCommand;
