import { Message, MessageEmbed } from "discord.js";
import Command from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import BotMessage from "../../handlers/BotMessage";
import cb from "../../misc/codeblock";

class HelpCommand extends Command {
  constructor() {
    super({
      name: "help",
      description: "Lists the available commands.",
      usage: ["help", "help <command>"],
      aliases: ["commands", "cmds", "h"],
      examples: ["help about", "help wp"],
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const db = new DB(client.models);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const is_beta = await db.check_optin(message);

    // if `&help <command_name>` excluding `&help beta`
    if (args[0] && args[0] !== "beta") {
      const beta_version = client.beta_commands
        .filter((e) => !e.hidden)
        .find((x) => x.name === args[0] || x.aliases.includes(args[0]));

      const stable_version = client.commands
        .filter((e) => !e.hidden)
        .find((x) => x.name === args[0] || x.aliases.includes(args[0]));

      let command;

      if (beta_version && is_beta) {
        command = beta_version;
      } else if (stable_version) {
        command = stable_version;
      } else {
        command = beta_version;
      }

      if (!command || command.hidden) return;

      let usage = Array.isArray(command.usage)
        ? command.usage
        : [command.usage];
      usage = usage.map((e) => cb(server_prefix + e));

      const aliases = !(command.aliases && command.aliases.length)
        ? false
        : command.aliases.map((e) => cb(server_prefix + e));

      const extra_aliases = command.extra_aliases
        ?.map((e) => cb(server_prefix + e))
        .join(", ");

      const examples = !command.examples
        ? false
        : command.examples
            .map((example) => {
              return cb(server_prefix + example);
            })
            .join("\n");

      const embed = new MessageEmbed()
        .setTitle(command.name)
        .setDescription(command.description);

      if (aliases) embed.addField("Aliases", aliases);
      if (extra_aliases) embed.addField("Extra aliases", extra_aliases);
      if (examples) embed.addField("Examples", examples);
      if (usage.length) embed.addField("Usage", usage);

      message.channel.send(embed);
      return;
    }

    /* if no specific command is requested */
    let description = `This is a list of the commands this bot offers. The prefix is \`${server_prefix}\`.`;
    if (args[0] === "beta") {
      description = `This is a list of the __beta__ commands this bot offers that are not in the stable version. The prefix is \`${server_prefix}\`.`;
    }

    const embed = new MessageEmbed()
      .setTitle("Commands")
      .setDescription(
        `See ${cb(
          "help <command_name>",
          server_prefix
        )} for detailed information. The prefix is ${cb(server_prefix)}.`
      );

    const stable_commands = client.commands;
    const beta_commands = client.beta_commands;

    const unique_beta_commands = beta_commands
      .filter(
        (command) => !stable_commands.find((c) => c.name === command.name)
      )
      .map((e) => {
        e.beta = true;
        return e;
      });

    let commands = stable_commands;

    if (args[0] === "beta") {
      commands = unique_beta_commands;
    } else {
      if (is_beta) {
        commands = [...stable_commands, ...unique_beta_commands];
      }
    }

    commands = commands.filter((e) => !e.hidden);

    const setup: Command[] = [];
    const userstat: Command[] = [];
    const serverstat: Command[] = [];
    const configure: Command[] = [];
    const other: Command[] = [];
    commands.forEach((command) => {
      switch (command.category) {
        case "setup":
          setup.push(command);
          break;

        case "userstat":
          userstat.push(command);
          break;

        case "serverstat":
          serverstat.push(command);
          break;

        case "configure":
          configure.push(command);
          break;

        default:
          other.push(command);
      }
    });

    const that = this;
    const setup_str: string = setup
      .map((command) => that.format_command(command, server_prefix))
      .join("\n\n");
    const userstat_str: string[] = userstat.map((command) =>
      that.format_command(command, server_prefix)
    );

    const serverstat_str: string = serverstat
      .map((command) => that.format_command(command, server_prefix))
      .join("\n\n");
    const configure_str: string = configure
      .map((command) => that.format_command(command, server_prefix))
      .join("\n\n");
    const other_str: string = other
      .map((command) => that.format_command(command, server_prefix))
      .join("\n\n");

    // https://stackoverflow.com/questions/9181188
    const halfwayThrough = Math.floor(userstat_str.length / 2);
    const userstat_one = userstat_str.slice(0, halfwayThrough).join("\n\n");
    const userstat_two = userstat_str
      .slice(halfwayThrough, userstat_str.length)
      .join("\n\n");

    embed.addField("__Setting up__", setup_str, true);
    embed.addField("__User-related stats__", userstat_one, true);
    embed.addField("__More user-related stats__", userstat_two, true);
    embed.addField("__Server-related stats__", serverstat_str, true);
    embed.addField("__Preferences__", configure_str, true);
    embed.addField("__Other__", other_str, true);

    response.text =
      "FAQs and commands' descriptions can be found here: <https://d-shaun.github.io/cbdocs/>.";

    await message.channel.send(embed);
    await response.send();
  }

  format_command(command: Command, server_prefix: string) {
    const usage = Array.isArray(command.usage)
      ? command.usage[0]
      : command.usage;

    const aliases = command.aliases;
    const all_shortcuts = [command.name, ...aliases]
      .map((e) => cb(e, server_prefix))
      .join(" / ");

    const beta_str = command.beta ? "(:warning: beta)" : "";
    return beta_str + all_shortcuts + "\n" + command.description;
  }
}

export default HelpCommand;
