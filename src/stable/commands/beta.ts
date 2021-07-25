import { Client } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import cb from "../../misc/codeblock";

class BetaCommand extends Command {
  constructor() {
    super({
      name: "beta",
      description: "Toggles beta features in a server.",
      usage: ["beta"],
      aliases: [],
      category: "configure",
    });
  }

  async run(client: Client, bot: CrownBot, message: GuildMessage) {
    const server_prefix = bot.cache.prefix.get(message.guild);
    const db = new DB(bot.models);
    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });

    if (!message.member?.permissions.has("MANAGE_GUILD")) {
      response.text =
        "You do not have the permission (``MANAGE_GUILD``) to execute this command.";
      await response.send();
      return;
    }
    const is_beta = await db.check_optin(message);
    if (!is_beta) {
      await db.opt_in(message);
      response.text =
        `Beta features have been enabled in this server—` +
        `run ${cb("beta", server_prefix)} again to disable; ` +
        `see ${cb(
          "commands beta",
          server_prefix
        )} for a list of available beta commands.`;
      await response.send();
    } else {
      await db.opt_out(message);
      response.text = `Beta features have been disabled in this server; run ${cb(
        "beta",
        server_prefix
      )} again to re-enable.`;
      await response.send();
    }
  }
}

export default BetaCommand;
