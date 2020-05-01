import { Message } from "discord.js";
import Command from "../classes/Command";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
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
    const code = args.join(" ");
    let result;
    try {
      result = await eval(code);
      if (typeof result == "object") {
        result = JSON.stringify(result, null, 2);
      }
    } catch (e) {
      result = e.message;
    }
    if (result) {
      result = result.substring(0, 1900);
    }
    await new BotMessage({
      client,
      message,
      text: "```JS\n" + result + "\n```",
      reply: false,
      noembed: true,
    }).send();
  }
}

export default EvalCommand;
