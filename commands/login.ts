import { Message } from "discord.js";
import Command from "../classes/Command";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import { LastFM } from "../handlers/LastFM";
import cb from "../misc/codeblock";
class LoginCommand extends Command {
  constructor() {
    super({
      name: "login",
      description:
        "Logs user into the bot―linking their Discord and LastFM account in the database.",
      usage: ["login"],
      aliases: [],
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const prefix = client.get_cached_prefix(message);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    if (args.length === 0) {
      response.text = `please provide your Last.fm username along with the login command;
      see ${cb("help login", prefix)}.`;
      await response.send();
      return;
    }

    const db = new DB(client.models);
    const user = await db.fetch_user(message.author.id);
    if (user) {
      response.text = new Template(client, message).get("already_logged");
      await response.send();
      return;
    }

    const username = args.join();
    const { status, data } = await new LastFM().query({
      method: "user.getinfo",
      params: {
        user: username,
      },
    });
    if (status === 404) {
      response.text = `Username not found on Last.fm―please check for any misspellings.`;
      await response.send();
    } else if (status === 200 && data.user) {
      if (await db.add_user(message.author.id, username)) {
        response.text = `Username ${cb(
          username
        )} has been associated to your Discord account.`;
      } else {
        response.text = new Template(client, message).get("exception");
      }
      await response.send();
    } else {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
    }
  }
}

export default LoginCommand;
