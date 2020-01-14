const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");
class PrefixCommand extends Command {
  constructor() {
    super({
      name: "prefix",
      description: "Changes bot prefix for a guild.",
      usage: ["prefix <new_prefix>"],
      aliases: ["pr"]
    });
  }

  async run(client, message, args) {

    const server_prefix = client.getCachedPrefix(message);

    const { update_prefix } = client.helpers;
    var prefix = undefined;
    if (args.length === 0) {
      await message.reply(
        `the prefix for this server is \`\`${server_prefix}\`\`; execute \`\`${server_prefix}prefix <new_prefix>\`\` to change it.`
      );
      return;
    }

    if (!message.member.hasPermission("MANAGE_GUILD")) {
      await message.reply(
        "you do not have the permission (``MANAGE_GUILD``) to execute this command."
      );
      return;
    }

    prefix = args.join(` `);

    if (!prefix) return;
    update_prefix({
      client,
      message,
      prefix
    });
  }
}

module.exports = PrefixCommand;
