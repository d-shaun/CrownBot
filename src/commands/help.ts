import { Message, MessageEmbed } from "discord.js";
import Command from "../classes/Command";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";

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

    if (args[0] && args[0] !== "beta") {
      const command = client.commands
        .filter((e) => !e.hidden)
        .find((x) => x.name === args[0] || x.aliases.includes(args[0]));

      if (!command || command.hidden) return;
      if (command.beta && !(await db.check_optin(message))) {
        return;
      }

      let usage = Array.isArray(command.usage)
        ? command.usage
        : [command.usage];
      usage = usage.map((e) => `\`\`${server_prefix}${e}\`\``);

      const aliases = !(command.aliases && command.aliases.length)
        ? false
        : command.aliases.map((e) => `\`\`${server_prefix}${e}\`\``);

      const examples = !command.examples
        ? false
        : command.examples
            .map((example) => {
              return `\`\`${server_prefix}${example}\`\``;
            })
            .join("\n");

      const embed = new MessageEmbed()
        .setTitle(command.name)
        .setDescription(command.description)
        .addField("Usage", usage);

      if (aliases) embed.addField("Aliases", aliases);
      if (examples) embed.addField("Examples", examples);

      message.channel.send(embed);
    } else {
      const embed = new MessageEmbed()
        .setTitle("Commands")
        .setDescription(
          `This is a list of the${
            args[0] === "beta" ? " __beta__" : ""
          } commands this bot offers. The prefix is \`${server_prefix}\`.`
        );
      let commands = client.commands;
      if (args[0] === "beta") {
        commands = commands.filter((cmd) => cmd.beta === true);
      } else {
        const is_beta = await db.check_optin(message);
        if (!is_beta) {
          commands = commands.filter((cmd) => cmd.beta !== true);
        }
      }
      commands
        .filter((e) => !e.hidden)
        .forEach((command) => {
          const usage = Array.isArray(command.usage)
            ? command.usage[0]
            : command.usage;

          const aliases = command.aliases;
          const all_commands = [usage, ...aliases]
            .map((e) => "``" + server_prefix + e + "``")
            .join(" or ");
          embed.addField(
            `${all_commands}`,
            (command.beta ? "(:warning: Beta) " : "") + command.description,
            true
          );
        });
      message.channel.send(embed);
    }
  }
}

export default HelpCommand;
