import { Message } from "discord.js";
import Command from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import esm from "../../misc/escapemarkdown";

class MyLoginCommand extends Command {
  constructor() {
    super({
      name: "mylogin",
      description: "Displays user's Last.fm username.",
      usage: ["mylogin"],
      aliases: ["me"],
      require_login: true,
      category: "setup",
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild?.id, message.author.id);
    if (!user) return;
    response.text = `your Last.fm username is ${esm(
      user.username
    )} ([visit](https://last.fm/user/${user.username})).`;
    await response.send();
  }
}

export default MyLoginCommand;
