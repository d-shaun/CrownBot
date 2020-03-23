const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");
const BotEmbed = require("../classes/BotEmbed");
class AboutCommand extends Command {
  constructor() {
    super({
      name: "about",
      description:
        "Displays the bot's support server, status, version, maintainer, and invite link.",
      usage: ["about"],
      aliases: ["invite"]
    });
  }

  async run(client, message, args) {
    const server_prefix = client.getCachedPrefix(message);

    const embed = new BotEmbed(message)
      .setTitle("CrownBot")
      .setDescription(
        "A cloned and refactored version of <https://github.com/kometh0616/crown-bot>."
      )
      .addField("Version", "2.4.0")
      .addField("Prefix", server_prefix)
      .addField("Status", "stable")
      .addField("Maintainer", "shaun#4761")
      .addField(
        "Invite link",
        "https://discordapp.com/api/oauth2/authorize?client_id=636075999154536449&permissions=288832&scope=bot"
      )
      .addField("Support server", "https://discord.gg/zzJ5zmA");

    await message.channel.send(embed);
  }
}

module.exports = AboutCommand;
