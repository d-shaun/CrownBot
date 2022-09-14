import Command, { GuildMessage } from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
class EvalShorthand extends Command {
  constructor() {
    super({
      name: "evalcommand",
      description: "You aren't supposed to be seeing this.",
      usage: [],
      aliases: ["ec", "ecm"],
      owner_only: true,
      hidden: true,
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    if (message.author.id !== bot.owner_ID) return; // just to be safe

    const new_args = ["command", ...args];
    await bot.commands
      .find((cmd) => cmd.name === "eval")
      ?.run(bot, message, new_args);
  }
}

export default EvalShorthand;
