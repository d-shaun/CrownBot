const Command = require("../handler/Command");
const BotEmbed = require("../classes/BotEmbed");

class HelpCommand extends Command {
  constructor() {
    super({
      name: "help",
      description: "Lists the available commands.",
      usage: ["help", "help <command>"],
      aliases: ["h"]
    });
  }

  async run(client, message, args) {
    if (args[0]) {
      const command = client.commands
        .filter(e => !e.hidden)
        .find(x => x.name === args[0] || x.aliases.includes(args[0]));
        console.log(command);
        if(command){
            var usage = Array.isArray(command.usage)
            ? command.usage
            : [command.usage];
            usage = usage.map(e=>`\`\`${client.prefix}${e}\`\``)

            var aliases = command.aliases;
            aliases = aliases.map(e=>`\`\`${client.prefix}${e}\`\``)
            const embed = new BotEmbed(message)
            .setTitle(command.name)
            .setDescription(
              command.description
            )
            .addField("Usage", usage)
            .addField("Aliases", aliases)
            message.channel.send(embed)
        }
    } else {
      const embed = new BotEmbed(message)
        .setTitle("Commands")
        .setDescription(
          "This is a list of the commands this bot offers. The prefix is ``&``; you cannot change it."
        );

      client.commands
        .filter(e => !e.hidden)
        .forEach(command => {
          var usage = Array.isArray(command.usage)
            ? command.usage[0]
            : command.usage;

          var aliases = command.aliases;
          var all_commands = [usage, ...aliases]
            .map(e => "``" + client.prefix + e + "``")
            .join(" or ");
          embed.addField(`${all_commands}`, command.description, true);
        });
      message.channel.send(embed);
    }
  }
}

module.exports = HelpCommand;
