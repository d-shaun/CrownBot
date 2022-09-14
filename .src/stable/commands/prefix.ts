import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import cb from "../../misc/codeblock";

class PrefixCommand extends Command {
  constructor() {
    super({
      name: "prefix",
      description: "Changes bot prefix for a guild.",
      usage: ["prefix", "prefix <new_prefix>"],
      aliases: ["pr"],
      examples: ["prefix !", "prefix >"],
      category: "configure",
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const response = new BotMessage({ bot, message, text: "", reply: true });
    response.text =
      "The `prefix` command has been migrated as a sub-command inside `&config`; please use `&config prefix` instead.\nExample: `&config prefix !`";
    await response.send();
  }
}

export default PrefixCommand;
