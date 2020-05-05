import { Message, MessageEmbed, TextChannel } from "discord.js";
import Command from "../classes/Command";
import CrownBot from "../handlers/CrownBot";
class PermissionsCommand extends Command {
  constructor() {
    super({
      name: "permissions",
      description: "Lists required permissions with brief descriptions.",
      usage: [],
      aliases: ["permission", "perms"],
      hidden: true,
    });
  }

  async run(client: CrownBot, message: Message, args: String[]) {
    if (!message.guild || !message.guild.me) return;
    const bot_permissions = (<TextChannel>message.channel).permissionsFor(
      message.guild.me
    );
    if (!bot_permissions) throw "Bot has no permission!";

    const permissions = [
      {
        name: "MANAGE_MESSAGES",
        detail:
          "Permission required for the pagination feature in the following commands: `whoknows`, `whoplays`, and `crowns`.",
      },
      {
        name: "EMBED_LINKS",
        detail: "Permission required for the bot to be able to send embeds.",
      },
      {
        name: "READ_MESSAGE_HISTORY",
        detail:
          "Permission required for the bot to 'listen' to emoji-reactions in text messages; it is used in the following commands: `logout`, `ban`.",
      },
      {
        name: "ADD_REACTIONS",
        detail:
          "Permission required for the bot to be able to add reaction(s) to message(s); it is used in commands mentioned above in `MESSAGE_MESSAGE` and `READ_MESSAGE_HISTORY` sections.",
      },
    ];

    let reply = permissions.map((permission) => {
      return `\`${permission.name}\`: ${permission.detail}`;
    });

    if (!bot_permissions.has("EMBED_LINKS")) {
      await message.channel.send(
        "**Required permissions** \n" + reply.join("\n")
      );

      return;
    }

    const embed = new MessageEmbed()
      .setTitle("Permissions")
      .setDescription(
        `Brief explanations of permissions required by the bot.\n\n\n ${reply.join(
          "\n\n"
        )}`
      );

    await message.channel.send(embed);
  }
}

export default PermissionsCommand;
