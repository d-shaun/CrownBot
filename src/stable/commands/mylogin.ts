import Command, { GuildMessage } from "../../classes/Command";
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
      aliases: ["me", "lastfm", "username"],
      require_login: true,
      category: "setup",
    });
  }

  async run(bot: CrownBot, message: GuildMessage) {
    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(bot.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;
    response.text = `your Last.fm username is ${esm(
      user.username
    )} ([visit](https://last.fm/user/${user.username})).`;
    await response.send();
  }
}

export default MyLoginCommand;
