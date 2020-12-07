import { Message, MessageEmbed } from "discord.js";
import Command from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
class AboutCommand extends Command {
  constructor() {
    super({
      name: "about",
      description:
        "Displays the bot's support server, status, version, maintainer, and invite link.",
      usage: ["about"],
      aliases: ["invite"],
      allow_banned: true,
      category: "setup",
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const embed = new MessageEmbed()
      .setTitle("CrownBot")
      .setDescription(
        "A Discord bot that uses the Last.fm API to track users' scrobbling-history to provide various stats and leader-boards."
      )
      .addField("Version", "8.3.0")
      .addField("Prefix", server_prefix)
      .addField("Maintainer", "shaun#4761")
      .addField("Repository", "<https://github.com/d-shaun/CrownBot/>")
      .addField(
        "Invite link",
        "<https://discordapp.com/api/oauth2/authorize?client_id=636075999154536449&permissions=288832&scope=bot>"
      )
      .addField("Support server", "https://discord.gg/zzJ5zmA");

    await message.channel.send(embed);
  }
}

export default AboutCommand;
