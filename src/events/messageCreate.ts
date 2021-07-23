import { Client, PermissionString, TextChannel } from "discord.js";
import Command, { GuildMessage } from "../classes/Command";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import cb from "../misc/codeblock";
export default async (bot: CrownBot, client: Client, message: GuildMessage) => {
  const db = new DB(bot.models);
  if (!message.guild) return;
  if (!client.user)
    throw "'client.user' is not defined; how are we even here?!";

  if (!bot.cache.prefix.check()) {
    throw "Prefixes were not cached. Please execute `[client].cache.prefix.init()` before event handlers.";
  }

  if (!bot.cache.config.check()) {
    throw "Server configs were not cached. Please execute `[client].cache.config.init()` before event handlers.";
  }

  const response = new BotMessage({ bot, message, text: "", reply: true });

  const server_prefix = bot.cache.prefix.get(message.guild);
  if (
    message.mentions.has(client.user, {
      ignoreEveryone: true,
      ignoreRoles: true,
    })
  ) {
    response.text = `The prefix for this server is \`${server_prefix}\`. Try \`${server_prefix}help\`.`;
    await response.send();
    return;
  }

  if (!message.content.startsWith(server_prefix)) return;
  const checks: boolean[] = [
    // check if bot has SEND_MESSAGES permission in the guild
    !!message.guild.me?.permissions.has("SEND_MESSAGES"),

    // check if bot has SEND_MESSAGES permission in the channel
    !!(<TextChannel>message.channel)
      .permissionsFor(client.user)
      ?.has("SEND_MESSAGES"),

    // check if it's a text-channel
    message.channel.type === "GUILD_TEXT",

    // check if it's not a bot
    !message.author.bot,
  ];

  if (checks.some((check) => !check)) return;

  const args = message.content.slice(server_prefix.length).split(/ +/gi);
  const command_name = args.shift()?.toLowerCase();
  if (!command_name) return;

  const get_command = function (name: string, beta = false) {
    if (!beta) {
      return bot.commands.find((x) => {
        return (
          x.name === name ||
          x.aliases.includes(name) ||
          x.extra_aliases?.includes(name)
        );
      });
    } else {
      return bot.beta_commands.find((x) => {
        return x.name === name || x.aliases.includes(name);
      });
    }
  };

  const override = command_name.split(":");
  let command = get_command(command_name);
  const beta_command = get_command(command_name, true);
  if (override.length === 2 && override[0] === "b") {
    const beta_command = get_command(override[1], true);
    if (beta_command) {
      command = beta_command;
    } else {
      command = get_command(override[1]);
    }
  } else if (beta_command && (await db.check_optin(message))) {
    command = beta_command;
  }

  if (!command || !command.execute) return;
  if (!check_permissions(bot, message, command)) return;

  try {
    await command.execute(client, bot, message, args);
  } catch (e) {
    console.log(e);
  }
};

function check_permissions(
  bot: CrownBot,
  message: GuildMessage,
  command: Command
): boolean {
  const response = new BotMessage({ bot, message, text: "", reply: true });
  const server_prefix = bot.cache.prefix.get(message.guild);

  if (!message.guild?.me) throw "!?!";
  const bot_permissions = (<TextChannel>message.channel).permissionsFor(
    message.guild.me
  );
  if (!bot_permissions) throw "Bot has no permission!";

  const permissions = [
    "MANAGE_MESSAGES",
    "EMBED_LINKS",
    "READ_MESSAGE_HISTORY",
    "ADD_REACTIONS",
  ];

  const lacking_permissions: string[] = [];

  permissions.forEach((permission) => {
    if (!bot_permissions.has(<PermissionString>permission)) {
      lacking_permissions.push(permission);
    }
  });

  if (lacking_permissions.length && command.name !== "permissions") {
    response.text =
      `The bot needs to have the following permissions: ` +
      `${lacking_permissions.join(", ")}; see ${cb(
        "permissions",
        server_prefix
      )} for explanations of every permission the bot requires.`;
    response.send();
    return false;
  }
  return true;
}
