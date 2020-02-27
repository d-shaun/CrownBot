const Command = require("../handler/Command");

class LogoutCommand extends Command {
  constructor() {
    super({
      name: "logout",
      description: "Unsets user's Last.fm username.",
      usage: ["logout"],
      aliases: ["delnick"]
    });
  }

  async run(client, message, args) {
    const msg = await client.notify({
      message,
      desc:
        "are you sure you want to unset your Last.fm username? Click on this reaction to proceed.",
      reply: true
    });
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
      const { users, crowns } = client.models;
      const foundUser = await users.findOneAndRemove(
        {
          userID: message.author.id
        },
        {
          useFindAndModify: false
        }
      );

      if (foundUser) {
        await client.notify({
          message,
          desc:
            "``" +
            foundUser.username +
            "`` has been disassociated from your account.",
          reply: true
        });
      } else {
        await client.notify({
          message,
          desc: "no Last.fm username is associated to this account.",
          reply: true
        });
      }
    } else {
      await client.notify({
        message,
        desc: "reaction was not clicked; no changes were made.",
        reply: true
      });
    }
  }
}

module.exports = LogoutCommand;
