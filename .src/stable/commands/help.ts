import {
  MessageActionRow,
  EmbedBuilder,
  MessageSelectMenu,
  MessageSelectOptionData,
  SelectMenuInteraction,
} from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
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

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = bot.cache.prefix.get(message.guild);
    const db = new DB(bot.models);
    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });

    // if `&help <command_name>` excluding `&help beta`
    if (args[0] && args[0] !== "beta") {
      const is_beta = await db.check_optin(message);

      const beta_version = bot.beta_commands
        .filter((e) => !e.hidden)
        .find((x) => x.name === args[0] || x.aliases.includes(args[0]));

      const stable_version = bot.commands
        .filter((e) => !e.hidden)
        .find((x) => x.name === args[0] || x.aliases.includes(args[0]));

      let command;

      // get beta version's info if server is opted-in
      if (beta_version && is_beta) {
        command = beta_version;
      } else if (stable_version) {
        command = stable_version;
      } else {
        command = beta_version;
      }

      if (!command || command.hidden) {
        response.text = "Command not found.";
        await response.send();
        return;
      }

      let usage = Array.isArray(command.usage)
        ? command.usage
        : [command.usage];
      usage = usage.map((e) => cb(server_prefix + e));

      const aliases = !(command.aliases && command.aliases.length)
        ? false
        : command.aliases.map((e) => cb(server_prefix + e)).join("");

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

      const embed = new EmbedBuilder()
        .setTitle(command.name)
        .setDescription(command.description);

      if (aliases) embed.addField("Aliases", aliases);
      if (extra_aliases) embed.addField("Extra aliases", extra_aliases);
      if (examples) embed.addField("Examples", examples);
      if (usage.length) embed.addField("Usage", usage.join("\n"));

      message.channel.send({ embeds: [embed] });
      return;
    }

    const message_options = <MessageSelectOptionData[]>[
      {
        label: "Top commands",
        emoji: "👑",
        value: "top",
        description: "Top essential and most-used commands",
      },
      {
        label: "Setting up",
        emoji: "🦋",
        value: "setup",
        description: "Primary commands to get you set up with the bot",
      },
      {
        label: "User-related stats",
        emoji: "🙇",
        value: "userstat",
        description: "Individual user's stats—like charts, list, crowns",
      },
      {
        label: "Server-related stats",
        emoji: "📊",
        value: "serverstat",
        description: "Server's stats—like crownboard, 'who knows'",
      },
      {
        label: "Preferences",
        emoji: "🛠️",
        value: "configure",
        description: "Commands to configure bot's preferences",
      },
      {
        label: "Beta commands",
        emoji: "✨",
        value: "beta",
        description: "Experimental commands",
      },
      {
        label: "Other",
        emoji: "🪄",
        value: "other",
        description: "Commands that do not fit the existing categories",
      },
    ];

    const select = new MessageSelectMenu()
      .setCustomId("help_menu" + bot.buttons_version)
      .setPlaceholder("Change category")
      .setMaxValues(1)
      .setMinValues(1)
      .addOptions(message_options);

    const row = new MessageActionRow().addComponents([select]);

    const default_embed = generate_embed(
      bot,
      args[0] || "top", // either beta or top
      server_prefix
    );
    if (!default_embed) throw "Couldn't generate 'setup' embed";
    await message.channel.send({ embeds: [default_embed], components: [row] });
  }
}

function generate_embed(
  bot: CrownBot,
  category: string,
  server_prefix: string
): false | EmbedBuilder {
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

    return `**${server_prefix}${command.name}** ${aliases} ${beta_str}\n└ ${command.description}\n\n`;
  };

  const stable_commands = bot.commands;
  const beta_commands = bot.beta_commands;
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
    // TODO: Dynamically pull top-commands from db?
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
  const embed = new EmbedBuilder().setTitle(title);

  if (category === "beta") {
    // workaround for categorizing beta commands

    embed.setDescription(
      "Beta commands are generally unstable and are disabled by default; if you wish **to enable them**, use the `&beta` command."
    );
  }

  if (commands.length > 8) {
    // https://stackoverflow.com/questions/9181188
    const halfwayThrough = Math.floor(commands.length / 2);

    const one = commands.slice(0, halfwayThrough).map(format_command).join("");
    const two = commands
      .slice(halfwayThrough, commands.length)
      .map(format_command)
      .join("");

    embed.addField("\u200b‎‏‏‎", one, true);
    embed.addField("\u200b‎‏‏‎", two, true);
  } else {
    embed.addField("\u200b‎‏‏‎", commands.map(format_command).join(""), false);
  }

  return embed;
}

export async function help_navigate(
  bot: CrownBot,
  interaction: SelectMenuInteraction
) {
  if (!interaction.guild) return;
  const server_prefix = bot.cache.prefix.get(interaction.guild.id);
  const embed = generate_embed(bot, interaction.values[0], server_prefix);
  if (embed) await interaction.update({ embeds: [embed] });
}

export default HelpCommand;
