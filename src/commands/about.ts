import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import CrownBot from "../handlers/CrownBot";

const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription(
      "Displays the bot's invite link, support server, maintainer, and more"
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: CommandInteraction
  ) {
    const row = <ActionRowBuilder<ButtonBuilder>>(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Invite to your server (DOESNT WORK CURRENTLY)")
          .setStyle(ButtonStyle.Link)
          .setURL(
            "https://discordapp.com/api/oauth2/authorize?client_id=636075999154536449&permissions=288832&scope=bot"
          ),
        new ButtonBuilder()
          .setLabel("Join support server (NEW LINK TO NEW SERVER!!)")
          .setStyle(ButtonStyle.Link)
          .setURL("https://discord.gg/4vU6kGhejv")
      )
    );

    const embed = new EmbedBuilder()
      .setTitle("CrownBot")
      .setDescription(
        "A Discord bot that uses the Last.fm API to track users' scrobbling-history to provide various stats and leader-boards."
      )

      .addFields([
        { name: "Version", value: bot.version },
        { name: "Maintainer", value: "shaun#4761" },
        { name: "Repository", value: "<https://github.com/d-shaun/CrownBot/>" },
        {
          name: "Invite link",
          value:
            "<https://discordapp.com/api/oauth2/authorize?client_id=636075999154536449&permissions=288832&scope=bot>",
        },
        {
          name: "New support server",
          value: "https://discord.gg/4vU6kGhejv",
        },
      ]);

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
