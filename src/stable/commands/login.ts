import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import { LastFM } from "../../handlers/LastFM";
import cb from "../../misc/codeblock";

class LoginCommand extends Command {
  constructor() {
    super({
      name: "login",
      description:
        "Logs user into the bot―linking their Discord and LastFM account in the database.",
      usage: ["login <lastfm username>"],
      aliases: [],
      category: "setup",
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const prefix = client.cache.prefix.get(message.guild);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild?.id, message.author.id);

    if (args.length === 0) {
      const legacy_user = await db.legacy_fetch_user(message.author.id);
      if (legacy_user && !user) {
        if (
          await db.add_user(
            message.guild?.id,
            message.author.id,
            legacy_user.username
          )
        ) {
          response.text =
            `You've been logged into the bot ` +
            `with your previously set username ${cb(
              legacy_user.username
            )} in this server; if you wish to change it, run ${cb(
              "login <new username>",
              prefix
            )}.`;
        } else {
          response.text = new Template(client, message).get("exception");
        }
        await response.send();

        return;
      }
      response.text =
        `please provide your Last.fm username along with the login command; ` +
        `see ${cb("help login", prefix)}.`;
      await response.send();
      return;
    }

    if (user) {
      await db.remove_user(message.guild?.id, message.author.id);
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
      if (await db.add_user(message.guild?.id, message.author.id, username)) {
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
