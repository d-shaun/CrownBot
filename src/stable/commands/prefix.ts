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

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = client.cache.prefix.get(message.guild);
    const response = new BotMessage({ client, message, text: "", reply: true });
    if (args.length === 0) {
      response.text =
        `The prefix for this server is \`${server_prefix}\`; ` +
        `execute ${cb("prefix <new_prefix>", server_prefix)} to change it.`;
      await response.send();
      return;
    }
    if (!message.member?.hasPermission("MANAGE_GUILD")) {
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
    await client.models.prefixes.findOneAndUpdate(
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
    if (client.cache.prefix.set(prefix, message.guild)) {
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

export default PrefixCommand;
