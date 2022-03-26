import { GuildMessage } from "../../../classes/Command";
import BotMessage from "../../../handlers/BotMessage";
import CrownBot from "../../../handlers/CrownBot";
import cb from "../../../misc/codeblock";

export default class Prefix {
  name = "prefix";
  description =
    "This changes the bot's prefix for a server." +
    "Examples: \n`&config prefix !` \n `&config prefix &`";

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = bot.cache.prefix.get(message.guild);
    const response = new BotMessage({ bot, message, text: "", reply: true });
    if (args.length === 0) {
      response.text =
        `The prefix for this server is \`${server_prefix}\`; ` +
        `execute ${cb("prefix <new_prefix>", server_prefix)} to change it.`;
      await response.send();
      return;
    }
    if (!message.member?.permissions.has("MANAGE_GUILD")) {
      response.text =
        "You do not have the permission (``MANAGE_GUILD``) to execute this command.";
      await response.send();
      return;
    }
    const prefix = args.join(" ");
    if (!prefix.match(/^\S{1,4}$/g)) {
      response.text = "Invalid prefix.";
      await response.send();
      return;
    }
    await bot.models.prefixes.findOneAndUpdate(
      {
        guildID: message.guild.id,
      },
      {
        guildID: message.guild.id,
        prefix,
        guildName: message.guild.name,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
    if (bot.cache.prefix.set(prefix, message.guild)) {
      response.text = `The prefix for this server is now set to ${cb(prefix)}.`;
    } else {
      response.text =
        `The prefix for this server is now set to ${cb(
          prefix
        )} but the cache couldn't be updated; the bot will continue using the previous prefix until it restarts. ` +
        `Please contact the bot maintainer (see [&]about).`;
    }
    response.send();
  }
}
