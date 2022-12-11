import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  ComponentType,
  SlashCommandBuilder,
} from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import cb from "../misc/codeblock";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("login")
    .setDescription("Login to the bot using your Last.fm username")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Last.fm username")
        .setRequired(true)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction
  ) {
    const response = new BotMessage({
      bot,
      interaction,
    });

    const username = interaction.options.getString("username", true);
    const escapeRegex = (str: string) => {
      return str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    };
    const RE = new RegExp("^" + escapeRegex(username) + "$", "i");
    const existing_crowns = await bot.models.crowns.find({
      guildID: interaction.guild.id,
      userID: interaction.user.id,
      lastfm_username: { $not: RE },
    });

    let has_existing_crowns = !!existing_crowns.length;

    /*
          Might need to run this after the timeout
    */
    const update_db = async () => {
      const db = new DB(bot.models);
      const user = await db.fetch_user(
        interaction.guild.id,
        interaction.user.id
      );
      if (user) {
        await db.remove_user(interaction.guild.id, interaction.user.id);
      }

      const lastfm_user = await new User({ username }).get_info();
      if (lastfm_user.lastfm_errorcode || !lastfm_user.success) {
        response.error("lastfm_error", lastfm_user.lastfm_errormessage);
        return;
      }

      if (
        await db.add_user(interaction.guild.id, interaction.user.id, username)
      ) {
        response.text = `Username ${cb(
          username
        )} has been associated to your Discord account.`;
      } else {
        response.text = new Template().get("exception");
      }
      await response.send();
    };

    /*
          ^^^^^ Might need to run this after the timeout
    */

    if (!has_existing_crowns) {
      await update_db();
      return;
    }

    if (has_existing_crowns) {
      const row = <ActionRowBuilder<ButtonBuilder>>(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("continue")
            .setLabel("DELETE crowns and continue")
            .setStyle(ButtonStyle.Danger),

          new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
        )
      );

      await interaction.followUp({
        content: `You have **${existing_crowns.length}** crowns registered under another Last.fm username.\nChanging your username will **delete** those crowns in this server. Continue?`,
        components: [row],
        ephemeral: true,
      });

      const filter = (i: ButtonInteraction) =>
        i.user.id === interaction.user.id;

      const collector = interaction.channel.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter,
        time: 120000,
      });
      bot.cache.collectors.add(collector);

      collector.once("collect", async (i) => {
        if (i.customId === "cancel") {
          await interaction.editReply({
            content: `Cancelled. No changes are made.`,
            components: [],
          });
        } else if (i.customId === "continue") {
          const delete_stats = await bot.models.crowns.deleteMany({
            userID: interaction.user.id,
            guildID: interaction.guild.id,
            lastfm_username: { $not: RE },
          });

          has_existing_crowns = false;

          await interaction.editReply({
            content: `Your **${delete_stats.deletedCount}** crowns registered under another username in this server have been deleted.`,
            components: [],
          });
          await update_db();
        }
      });
    }
  },
};
