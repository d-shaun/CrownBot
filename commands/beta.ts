import { Message } from "discord.js";
import Command from "../classes/Command";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import cb from "../misc/codeblock";
class BetaCommand extends Command {
  constructor() {
    super({
      name: "beta",
      description: "Toggles beta features in a server.",
      usage: ["beta"],
      aliases: [],
    });
  }

  async run(client: CrownBot, message: Message, args: String[]) {
    const server_prefix = client.get_cached_prefix(message);
    const db = new DB(client.models);
    const reply = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });

    if (!message.member?.hasPermission("MANAGE_GUILD")) {
      reply.text =
        "You do not have the permission (``MANAGE_GUILD``) to execute this command.";
      await reply.send();
      return;
    }
    const is_beta = await db.check_optin(message);
    if (!is_beta) {
      await db.opt_in(message);
      reply.text =
        `Beta features have been enabled in this server—` +
        `run ${cb("beta", server_prefix)} again to disable; ` +
        `see ${cb(
          "commands beta",
          server_prefix
        )} for a list of available beta commands.`;
      await reply.send();
    } else {
      await db.opt_out(message);
      reply.text = `Beta features have been disabled in this server; run ${cb(
        "beta",
        server_prefix
      )} again to re-enable.`;
      await reply.send();
    }
  }
}

export default BetaCommand;
