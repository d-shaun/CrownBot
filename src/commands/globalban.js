const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");
class GlobalBanCommand extends Command {
  constructor() {
    super({
      name: "globalban",
      description:
        "Globally ban a user from accessing the bot and showing up on the 'whoknows' list.",
      usage: ["globalban <@user>"],
      aliases: ["gban", "gb"],
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

    await bans.findOneAndUpdate(
      {
        userID
      },
      {
        userID,
        guildID: "any",
        guildName: "-globally blocked-",
        executor: message.author.tag,
        username: null
      },
      {
        upsert: true,
        useFindAndModify: false
      }
    );
    await notify({
      client,
      message,
      title: "Globally banned",
      description: `\`${userID}\` has been globally banned.`
    });
  }
}

module.exports = GlobalBanCommand;
