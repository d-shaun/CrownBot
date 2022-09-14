import { MessageActionRow, MessageButton, EmbedBuilder } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
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

  async run(bot: CrownBot, message: GuildMessage) {
    const row = new MessageActionRow().addComponents(
      new MessageButton()
        .setLabel("Invite to your server (DOESNT WORK CURRENTLY)")
        .setStyle("LINK")
        .setURL(
          "https://discordapp.com/api/oauth2/authorize?client_id=636075999154536449&permissions=288832&scope=bot"
        ),
      new MessageButton()
        .setLabel("Join support server (NEW LINK TO NEW SERVER!!)")
        .setStyle("LINK")
        .setURL("https://discord.gg/4vU6kGhejv")
    );

    const server_prefix = bot.cache.prefix.get(message.guild);
    const embed = new EmbedBuilder()
      .setTitle("CrownBot")
      .setDescription(
        "A Discord bot that uses the Last.fm API to track users' scrobbling-history to provide various stats and leader-boards."
      )
      .addField("Version", bot.version)
      .addField("Prefix", server_prefix)
      .addField("Maintainer", "shaun#4761")
      .addField("Repository", "<https://github.com/d-shaun/CrownBot/>")
      .addField(
        "Invite link",
        "<https://discordapp.com/api/oauth2/authorize?client_id=636075999154536449&permissions=288832&scope=bot>"
      )
      .addField(
        "Support server  (NEW LINK TO NEW SERVER!!)",
        "https://discord.gg/4vU6kGhejv"
      );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
}

export default AboutCommand;
