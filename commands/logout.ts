import { Message, MessageReaction, User } from "discord.js";
import Command from "../classes/Command";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import cb from "../misc/codeblock";
class LogoutCommand extends Command {
  constructor() {
    super({
      name: "logout",
      description: "Logs user out of the bot.",
      usage: ["logout"],
      aliases: [],
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

    const user = await db.fetch_user(message.author.id);
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
        "Are you sure you want to logout? Click on the reaction to continue.",
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
      if (await db.remove_user(message.author.id)) {
        response.text = "You have been logged out.";
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
