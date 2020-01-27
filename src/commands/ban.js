const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");
class BanCommand extends Command {
  constructor() {
    super({
      name: "ban",
      description:
        "Ban a user from accessing the bot and showing up on the 'whoknows' list.",
      usage: ["ban <@user>"],
      aliases: ["bn"]
    });
  }

  async run(client, message, args) {
    const { check_permissions, get_guild_user } = client.helpers;
    const { notify } = client.helpers;

    const has_required_permissions = check_permissions(message);

    if (!has_required_permissions) return;

    if (!message.member.hasPermission("BAN_MEMBERS")) {
      await notify({
        message,
        title: "Access denied",
        description:
          "You do not have the permission (``BAN_MEMBERS``) to execute this command.",
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
      await notify({
        message,
        title: "Invalid request",
        description:
          "`@` the user you want to ban from accessing the bot and showing up on the 'whoknows' list in this guild.",
        reply: true
      });
      return;
    }

    const is_banned_user = await client.models.bans.findOne({
      guildID: message.guild.id,
      userID: user.id
    });

    if (is_banned_user) {
      await notify({
        message,
        title: "User already banned",
        description: `\`${user.tag}\` has already been banned in this guild; try the 'unban' command instead maybe?`,
        reply: true
      });
      return;
    }

    const msg = await message.reply(
      "are you sure you want to ban `" +
        user.tag +
        "`? This will ban them from accessing the bot and showing up on the 'whoknows' list. " +
        "Click the reaction to continue."
    );
    await msg.react("✅");
    const rcFilter = (reaction, user) => {
      return reaction.emoji.name === "✅" && user.id === message.author.id;
    };
    const rcOptions = {
      max: 1,
      time: 30000
    };

    const reactions = await msg.awaitReactions(rcFilter, rcOptions);

    if (reactions.size > 0) {
      await client.models.bans.create({
        guildID: message.guild.id,
        guildName: message.guild.name,
        userID: user.id,
        username: user.tag,
        executor: `${message.author.tag} (${message.author.id})`
      });
      await msg.edit(
        `\`${user.tag}\` has been banned from accessing the bot and showing up on the 'whoknows' list.`
      );
      await msg.clearReactions();
    } else {
      await msg.edit(`Aborted; reaction wasn't clicked.`);
      await msg.clearReactions();
    }
  }
}

module.exports = BanCommand;
