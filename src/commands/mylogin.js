const Command = require("../handler/Command");

class MyLoginCommand extends Command {
  constructor() {
    super({
      name: "mylogin",
      description: "Displays user's Last.fm username.",
      usage: ["mylogin"],
      aliases: ["me"]
    });
  }

  async run(client, message, args) {
    const { get_username } = client.helpers;
    const user = await get_username(client, message);
    if (!user) return;
    await client.notify({
      message,
      desc: `your Last.fm username is \`\`${user.username}\`\` ([visit](https://last.fm/user/${user.username})).`,
      reply: true
    });
  }
}

module.exports = MyLoginCommand;
