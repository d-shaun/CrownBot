const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");

class UnbanCommand extends Command {
  constructor() {
    super({
      name: "unban",
      description: "Ban a user from accessing the bot.",
      usage: ["unban <@user>"],
      aliases: ["ubn"]
    });
  }

  async run(client, message, args) {
    const { check_permissions } = client.helpers;

    const has_required_permissions = check_permissions(message);

    if (!has_required_permissions) return;

    if (!message.member.hasPermission("BAN_MEMBERS")) {
      await message.reply(
        "you do not have the permission (``BAN_MEMBERS``) to execute this command."
      );
      return;
    }
    let user = message.mentions.members.first();

    if (!user) {
      let username = args.join().trim();
      user = message.guild.members.find(member => {
        return member.user.username.startsWith(username);
      });
    }
    user = user ? user.user : false;

    if (!user) {
      await message.reply("`@` the user you want to unban.");
      return;
    }

    const banned_user = await client.models.bans.findOne({
      guildID: message.guild.id,
      userID: user.id
    });
    if (!banned_user) {
      await message.reply(`\`${user.tag}\` hasn't been banned... yet.`);
      return;
    }
    await banned_user.remove();
    await message.reply(`\`${user.tag}\` has been unbanned.`);
  }
}

module.exports = UnbanCommand;
