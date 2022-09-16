import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonComponent,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  CollectorFilter,
  CommandInteraction,
  ComponentType,
  MessageReaction,
  SlashCommandBuilder,
  User as DiscordUser,
} from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
// import GuildCommandInteraction from "../classes/GuildCommandInteraction";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import cb from "../misc/codeblock";
import simple_confirm from "../misc/simple_confirm";

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
      text: "",
    });
    const db = new DB(bot.models);
    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
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

    if (existing_crowns.length) {
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

      await interaction.reply({
        content: `You have **${existing_crowns.length}** crowns registered under another Last.fm username.\nChanging your username will **delete** those crowns in this server. Continue?`,
        components: [row],
      });

      const filter = (i: ButtonInteraction) =>
        i.user.id === interaction.user.id;

      const collector =
        interaction.channel.createMessageComponentCollector<ComponentType.Button>(
          {
            filter,
            time: 120000,
          }
        );

      collector.on("collect", async (i) => {
        await i.update({ content: "The button was clicked!", components: [] });

        // if (reactions.size > 0) {
        //   const delete_stats = await bot.models.crowns.deleteMany({
        //     userID: message.author.id,
        //     guildID: message.guild.id,
        //     lastfm_username: { $not: RE },
        //   });
        //   response.text = `Your **${delete_stats.deletedCount}** crowns registered under another username in this server have been deleted.`;
        //   await response.send();
        // } else {
        //   response.text = "Reaction wasn't clicked; no changes are made.";
        //   await response.send();
        //   return;
        // }
      });
    }

    await db.unsnap(interaction.guild.id, interaction.user.id);
    if (user) {
      await db.remove_user(interaction.guild.id, interaction.user.id);
    }

    const lastfm_user = await new User({ username }).get_info();
    if (lastfm_user.lastfm_errorcode || !lastfm_user.success) {
      response.error("lastfm_error", lastfm_user.lastfm_errormessage);
      return;
    }

    if (await db.add_user(message.guild.id, message.author.id, username)) {
      response.text = `Username ${cb(
        username
      )} has been associated to your Discord account.`;
    } else {
      response.text = new Template(bot, message).get("exception");
    }
    await response.send();
  },
};

export default LoginCommand;
