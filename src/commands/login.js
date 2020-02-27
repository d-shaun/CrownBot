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
      await client.notify({
        message,
        desc: "you must provide a Last.fm username.",
        reply: true
      });
      return;
    }

    const user = await get_username(client, message, true);
    if (user) {
      await client.notify({
        message,
        desc:
          `you already have a nickname set; send \`\`${server_prefix}mylogin\`\` to ` +
          `see your username, or \`\`${server_prefix}logout\`\` to unset your nickname.`,
        reply: true
      });

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

        await client.notify({
          message,
          desc: `username \`\`${data.user.name}\`\` has been associated to your Discord account.`,
          reply: true
        });
      } else if (data.error === 6) {
        await client.notify({
          message,
          desc: "erm... nope, that user doesn't exist on Last.fm.",
          reply: true
        });
      }
    } catch (e) {
      await client.notify({
        message,
        desc: "something went wrong while executing the command.",
        reply: true
      });
      throw e;
    }
  }
}

module.exports = LoginCommand;
