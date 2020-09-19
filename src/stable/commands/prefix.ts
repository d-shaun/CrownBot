import { Message } from "discord.js";
import Command from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import BotMessage from "../../handlers/BotMessage";
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

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const response = new BotMessage({ client, message, text: "", reply: true });
    if (!message.guild) return;
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
        // @ts-ignore
        useFindAndModify: false,
      }
    );
    client.prefixes = undefined;
    response.text = `The prefix for this server is now set to ${cb(prefix)}.`;
    response.send();
  }
}

export default PrefixCommand;
