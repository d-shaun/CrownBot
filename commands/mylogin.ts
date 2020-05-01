import { Message } from "discord.js";
import Command from "../classes/Command";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";

class MyLoginCommand extends Command {
  constructor() {
    super({
      name: "mylogin",
      description: "Displays user's Last.fm username.",
      usage: ["mylogin"],
      aliases: ["me"],
    });
  }

  async run(client: CrownBot, message: Message, args: String[]) {
    const reply = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.author.id);
    if (!user) return;
    reply.text = `your Last.fm username is \`\`${user.username}\`\` ([visit](https://last.fm/user/${user.username})).`;
    await reply.send();
  }
}

export default MyLoginCommand;