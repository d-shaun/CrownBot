import { Message, PermissionString, TextChannel } from "discord.js";
import Command from "../classes/Command";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import cb from "../misc/codeblock";
export default async (client: CrownBot, message: Message) => {
  const db = new DB(client.models);
  if (!message.guild) return;
  if (!client.user)
    throw "'client.user' is not defined; how are we even here?!";
  if (!client.prefixes) {
    await client.cache_prefixes();
  }

  const response = new BotMessage({ client, message, text: "", reply: true });

  const server_prefix = client.get_cached_prefix(message);
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
    !!message.guild.me?.hasPermission("SEND_MESSAGES"),

    // check if bot has SEND_MESSAGES permission in the channel
    !!(<TextChannel>message.channel)
      .permissionsFor(client.user)
      ?.has("SEND_MESSAGES"),

    // check if it's a text-channel
    message.channel.type == "text",

    // check if it's not a bot
    !message.author.bot,
  ];

  if (checks.some((check) => !check)) return;

  const args = message.content.slice(server_prefix.length).split(/ +/gi);
  const command_name = args.shift()?.toLowerCase();
  let override_beta = false;
  if (!command_name) return;
  let command = null;
  const override = command_name.split(":");
  if (override.length == 2 && override[0] == "b") {
    command = <Command>client.commands.find((x) => {
      return (
        x.beta && (x.name === override[1] || x.aliases.includes(override[1]))
      );
    });
    override_beta = true;
  } else {
    command = <Command>client.commands.find((x) => {
      return x.name === command_name || x.aliases.includes(command_name);
    });
  }

  if (!command || !command.execute) return;

  const lacking_permissions = check_permissions(client, message);

  if (lacking_permissions.length && command.name !== "permissions") {
    response.text =
      `The bot needs to have the following permissions: ` +
      `${lacking_permissions.join(", ")}; see ${cb(
        "permissions",
        server_prefix
      )} for explanations of every permissions the bot requires.`;
    await response.send();
    return;
  }

  try {
    await command.execute(client, message, args, override_beta);
  } catch (e) {
    console.log(e);
  }
};

function check_permissions(client: CrownBot, message: Message): string[] {
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
  return lacking_permissions;
}
