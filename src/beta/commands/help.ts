import { MessageEmbed } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";

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

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    if (args) {
      // Todo: add suport for `&help command_name`
    }
    const top = new client.disbut.MessageMenuOption()
      .setLabel("Top commands")
      .setEmoji("👑")
      .setValue("top")
      .setDescription("Top essential and most-used commands")
      .setDefault();

    const setup = new client.disbut.MessageMenuOption()
      .setLabel("Setting up")
      .setEmoji("🦋")
      .setValue("setup")
      .setDescription("Primary commands to get you set up with the bot")
      .setDefault();

    const userstats = new client.disbut.MessageMenuOption()
      .setLabel("User-related stats")
      .setEmoji("🙇")
      .setValue("userstat")
      .setDescription("Individual user's stats—like charts, list, crowns.");

    const serverstats = new client.disbut.MessageMenuOption()
      .setLabel("Server-related stats")
      .setEmoji("📊")
      .setValue("serverstat")
      .setDescription("Server's stats—like crownboard, 'who knows'.");

    const configure = new client.disbut.MessageMenuOption()
      .setLabel("Preferences")
      .setEmoji("🛠️")
      .setValue("configure")
      .setDescription("Commands to configure bot's preferences.");

    const beta = new client.disbut.MessageMenuOption()
      .setLabel("Beta commands")
      .setEmoji("✨")
      .setValue("beta")
      .setDescription("Experimental commands");

    const other = new client.disbut.MessageMenuOption()
      .setLabel("Other")
      .setEmoji("🪄")
      .setValue("other")
      .setDescription("Commands that do not fit the existing categories.");

    const select = new client.disbut.MessageMenu()
      .setID("help_menu" + client.buttons_version)
      .setPlaceholder("Change category")
      .setMaxValues(1)
      .setMinValues(1)
      .addOptions([top, setup, userstats, serverstats, configure, beta, other]);

    const row = new client.disbut.MessageActionRow().addComponent(select);

    const default_embed = generate_embed(client, "top");
    if (!default_embed) throw "Couldn't generate 'setup' embed";
    await message.channel.send(default_embed, row);
  }
}

function generate_embed(
  client: CrownBot,
  category: string
): false | MessageEmbed {
  const server_prefix = "&";
  const top_commands = [
    "about",
    "login",
    "whoknows",
    "whoknowstrack",
    "chart",
    "list",
  ];

  const format_command = (command: Command) => {
    let aliases = command.aliases
      .map((alias) => "*" + server_prefix + alias + "*")
      .join(" / ");

    if (aliases) aliases = " — " + aliases;

    const beta_str = command.beta ? "(✨ beta)" : "";

    return `**${server_prefix}${command.name}** ${aliases} ${beta_str}\n└ ${command.description}\n`;
  };

  const stable_commands = client.commands;
  const beta_commands = client.beta_commands;
  const unique_beta_commands = beta_commands
    .filter((command) => !stable_commands.find((c) => c.name === command.name))
    .map((e) => {
      e.beta = true;
      return e;
    });

  const public_commands = [...stable_commands, ...unique_beta_commands].filter(
    (e) => !e.hidden
  );

  let commands: Command[] = [];
  if (category === "top") {
    // top commands based on the array
    // TODO: dynamically pull this from db?
    top_commands.forEach((top_command) => {
      const command = public_commands.find(
        (command) => command.name === top_command
      );
      if (command) commands.push(command);
    });
  } else {
    commands = public_commands.filter((command) => {
      // keep uncategorized commands in "other"
      if (category === "other")
        return command.category === category || !command.category;

      // return beta commands for the non-existent category "beta"
      if (category === "beta") return command.beta === true;

      return command.category === category;
    });
  }

  if (!commands.length) return false;

  let title = "Commands";

  switch (category) {
    case "top":
      title = "Top essential CrownBot commands";
      break;

    case "setup":
      title = "Setting up";
      break;

    case "serverstat":
      title = "Commands for server-related stats";
      break;

    case "userstat":
      title = "Commands for user-related stats";
      break;

    case "configure":
      title = "Commands to configure bot's preferences";
      break;

    case "beta":
      title = "Beta commands";
      break;

    case "other":
      title = "Other commands";
      break;
  }
  const embed = new MessageEmbed().setTitle(title);

  if (category === "beta") {
    // workaround for categorizing beta commands

    embed.setDescription(
      "Beta commands are generally unstable and are disabled by default; if you wish **to enable them**, use the `&beta` command."
    );
  }

  if (commands.length > 8) {
    // https://stackoverflow.com/questions/9181188
    const halfwayThrough = Math.floor(commands.length / 2);

    const one = commands.slice(0, halfwayThrough).map(format_command);
    const two = commands
      .slice(halfwayThrough, commands.length)
      .map(format_command);

    embed.addField("\u200b‎‏‏‎", one, true);
    embed.addField("\u200b‎‏‏‎", two, true);
  } else {
    embed.addField("\u200b‎‏‏‎", commands.map(format_command), false);
  }

  return embed;
}

export async function help_navigate(client: CrownBot, menu: any) {
  await menu.reply.defer();

  const embed = generate_embed(client, menu.values[0]);
  if (embed) await menu.message.edit(embed);
}

export default HelpCommand;
