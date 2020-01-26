const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");
class GlobalUnbanCommand extends Command {
  constructor() {
    super({
      name: "globalunban",
      description: "Globally unban without affecting per-guild ban.",
      usage: ["globalunban <@user>"],
      aliases: ["gubn", "gub"],
      hidden: true,
      ownerOnly: true
    });
  }

  async run(client, message, args) {
    const { bans } = client.models;
    const { notify } = client.helpers;
    let userID;
    if (args.length === 0) {
      await message.reply("no user ID provided.");
      return;
    } else {
      userID = args.join().trim();
    }

    const banned = await bans.findOne({
      userID,
      guildID: "any"
    });
    if (!banned) {
      await notify({
        client,
        message,
        title: "Not globally banned",
        description: `\`${userID}\` hasn't been globally banned.`
      });
      return;
    }
    await banned.remove();
    await notify({
      client,
      message,
      title: "Globally unbanned",
      description: `\`${userID}\` has been globally unbanned.`
    });
  }
}

module.exports = GlobalUnbanCommand;
