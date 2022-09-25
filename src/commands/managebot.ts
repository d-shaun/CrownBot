import { Client, SlashCommandBuilder } from "discord.js";
import { inspect } from "util";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import CrownBot from "../handlers/CrownBot";
import edit_lyrics from "./owner_commands/editlyrics";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("managebot")
    .setDescription("Commands to manage the bot (only for bot owner)")
    .setDefaultMemberPermissions(0)
    .addSubcommand((option) =>
      option
        .setName("eval")
        .setDescription("Execute code on the bot (owner only)")
        .addStringOption((option) =>
          option
            .setName("code")
            .setDescription("Code to execute")
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option
            .setName("hide_reply")
            .setDescription("Hide bot's reply")
            .setRequired(false)
        )
    )
    .addSubcommand((option) =>
      option
        .setName("editlyrics")
        .setDescription("Edit lyrics of a song on the database")
        .addStringOption((option) =>
          option
            .setName("track_name")
            .setDescription("Track Name")
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName("artist_name")
            .setDescription("Artist Name")
            .setRequired(false)
        )
        .addBooleanOption((option) =>
          option
            .setName("hide_reply")
            .setDescription("Hide bot's reply")
            .setRequired(false)
        )
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction
  ) {
    const hide_reply =
      interaction.options.getBoolean("hide_reply", false) || false;

    if (interaction.user.id !== bot.owner_ID) {
      await interaction.reply({
        content:
          "The /managebot command and its sub-commands can only be used by the bot owner. zzz.",
        ephemeral: true,
      });
      return;
    }

    if (hide_reply) await interaction.deferReply({ ephemeral: true });
    else await interaction.deferReply({ ephemeral: false });

    /*
    ***
        EVAL COMMAND
    ***
    */
    if (interaction.options.getSubcommand() === "eval") {
      const code = interaction.options.getString("code", true);
      let trimmed_string;
      try {
        let evaled = await eval(code);
        if (typeof evaled !== "string") {
          evaled = inspect(evaled);
        }
        trimmed_string = evaled.substring(0, 2000);
      } catch (e: any) {
        trimmed_string = (e.message ? e.message : e).substring(0, 2000);
      }

      await interaction.editReply("```JS\n" + trimmed_string + "```");
      return;
    }

    /*
    ***
        EDITLYRICS COMMAND
    ***
    */
    if (interaction.options.getSubcommand() === "editlyrics") {
      await edit_lyrics(bot, interaction);
      return;
    }
  },
};