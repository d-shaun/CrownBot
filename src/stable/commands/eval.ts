import { Message } from "discord.js";

import { inspect } from "util";
import Command, { GuildMessage } from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
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

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
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
