const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");

class UnbanCommand extends Command {
  constructor() {
    super({
      name: "unban",
      description: "Unban a banned user.",
      usage: ["unban <@user>", "unban <username>"],
      aliases: ["ubn"]
    });
  }

  async run(client, message, args) {
    const { check_permissions, get_guild_user } = client.helpers;

    const has_required_permissions = check_permissions(message);

    if (!has_required_permissions) return;

    if (!message.member.hasPermission("BAN_MEMBERS")) {
      await client.notify({
        message,
        desc:
          "you do not have the permission (``BAN_MEMBERS``) to execute this command.",
        reply: true
      });

      return;
    }
    let user = message.mentions.members.first();
    user = user ? user.user : false;

    if (!user && args.length !== 0) {
      user = await get_guild_user({
        args,
        message
      });
    }

    if (!user) {
      await client.notify({
        message,
        desc: "user not found; `@` the user you want to unban.",
        reply: true
      });

      return;
    }

    const banned_user = await client.models.bans.findOne({
      guildID: message.guild.id,
      userID: user.id
    });
    if (!banned_user) {
      await client.notify({
        message,
        desc: `\`${user.tag}\` hasn't been banned... yet.`,
        reply: true
      });

      return;
    }
    await banned_user.remove();
    await client.notify({
      message,
      desc: `\`${user.tag}\` has been unbanned.`,
      reply: true
    });
  }
}

module.exports = UnbanCommand;
