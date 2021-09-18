import { GuildMessage } from "../../../classes/Command";
import BotMessage from "../../../handlers/BotMessage";
import CrownBot from "../../../handlers/CrownBot";
import cb from "../../../misc/codeblock";

export default class SetCommand {
  name = "set";
  description =
    "Sets bot's config(s) in the database and temporarily re-writes the current session's config(s).";

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });

    if (!bot.botconfig) return;
    const config_name = args[0] as keyof typeof bot.botconfig;
    const value = args[1];
    if (!config_name || !value) {
      response.text = "?";
      await response.send();
      return;
    }
    if (Object.prototype.hasOwnProperty.call(bot.botconfig, config_name)) {
      // TODO: test this
      bot.botconfig[config_name] = <never>value; // ?? LMAO
      await bot.models.botconfig.findOneAndUpdate(
        {},
        { [config_name]: value },
        { useFindAndModify: false }
      );
      response.text = `${cb(config_name)} has been set to ${cb(value)}`;
    } else {
      response.text = "Config not found in the current session.";
    }
    await response.send();
  }
}
