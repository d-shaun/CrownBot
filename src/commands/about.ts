import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
} from "discord.js";
import GLOBALS from "../../GLOBALS";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";

const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription(
      "Display the bot's invite link, support server, maintainer, and more"
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    const row = <ActionRowBuilder<ButtonBuilder>>(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Invite to your server")
          .setStyle(ButtonStyle.Link)
          .setURL(
            "https://discord.com/api/oauth2/authorize?client_id=636075999154536449&permissions=313344&scope=bot"
          ),
        new ButtonBuilder()
          .setLabel("Join support server")
          .setStyle(ButtonStyle.Link)
          .setURL(GLOBALS.SUPPORT_SERVER)
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
            "<https://discord.com/api/oauth2/authorize?client_id=636075999154536449&permissions=313344&scope=bot>",
        },
        {
          name: "Support server",
          value: GLOBALS.SUPPORT_SERVER,
        },
      ]);

    response.embeds = [embed];
    response.embed_components = [row];
    return response;
  },
};
