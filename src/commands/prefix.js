const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");
class PrefixCommand extends Command {
  constructor() {
    super({
      name: "prefix",
      description: "Changes bot prefix for a guild.",
      usage: ["prefix", "prefix <new_prefix>"],
      aliases: ["pr"],
      examples: ["prefix !", "prefix >"]
    });
  }

  async run(client, message, args) {
    const server_prefix = client.getCachedPrefix(message);

    const { update_prefix } = client.helpers;
    var prefix = undefined;
    if (args.length === 0) {
      await client.notify({
        message,
        desc: `the prefix for this server is \`\`${server_prefix}\`\`; execute \`\`${server_prefix}prefix <new_prefix>\`\` to change it.`,
        reply: true
      });
      return;
    }

    if (!message.member.hasPermission("MANAGE_GUILD")) {
      await client.notify({
        message,
        desc:
          "you do not have the permission (``MANAGE_GUILD``) to execute this command.",
        reply: true
      });
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
