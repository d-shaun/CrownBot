const Command = require("../handler/Command");
const fetch = require("node-fetch");
const { stringify } = require("querystring");

class LoginCommand extends Command {
  constructor() {
    super({
      name: "login",
      description: "Sets user's Last.fm username.",
      usage: "login <lastfm username>",
      aliases: ["cblogin"],
      examples: ["login youtalkwaytoomuch"]
    });
  }

  async run(client, message, args) {
    const server_prefix = client.getCachedPrefix(message);
    const { get_username } = client.helpers;
    if (args.length === 0) {
      message.reply("you must provide a Last.fm username.");
      return;
    }

    const user = await get_username(client, message, true);
    if (user) {
      await message.reply(
        `you already have a nickname set; send \`\`${server_prefix}mylogin\`\` to ` +
          `see your username, or \`\`${server_prefix}logout\`\` to unset your nickname.`
      );
      return;
    }

    try {
      const params = stringify({
        method: "user.getinfo",
        api_key: client.apikey,
        user: args.join(" "),
        format: "json"
      });
      const data = await fetch(`${client.url}${params}`).then(r => r.json());
      if (data.user) {
        await client.models.users.create({
          userID: message.author.id,
          username: data.user.name
        });
        await message.reply(
          `username \`\`${data.user.name}\`\` has been associated to your Discord account.`
        );
      } else if (data.error === 6) {
        await message.reply("erm... nope, that username doesn't exist.");
        return;
      }
    } catch (e) {
      await message.reply("something went wrong while executing the command.");
      throw e;
    }
  }
}

module.exports = LoginCommand;
