import { Message } from "discord.js";
import Command from "../classes/Command";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import { inspect } from "util";
class EvalCommand extends Command {
  constructor() {
    super({
      name: "eval",
      description: "You aren't supposed to be seeing this.",
      usage: [],
      aliases: [],
      owner_only: true,
      hidden: true,
    });
  }

  async run(client: CrownBot, message: Message, args: String[]) {
    if (message.author.id !== client.owner_ID) return; // just to be safe
    let trimmed_string;
    try {
      const code = args.join(" ");
      let evaled = await eval(code);
      if (typeof evaled !== "string") {
        evaled = inspect(evaled);
      }
      trimmed_string = evaled.substring(0, 2000);
    } catch (e) {
      trimmed_string = (e.message ? e.message : e).substring(0, 2000);
    }

    await message.channel.send(trimmed_string, {
      code: "js",
      split: true,
    });
  }
}

export default EvalCommand;
