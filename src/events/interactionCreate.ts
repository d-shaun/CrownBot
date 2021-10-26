import { Client, Interaction, MessageEmbed } from "discord.js";
import CrownBot from "../handlers/CrownBot";
import { help_navigate } from "../stable/commands/help";
export default async (
  bot: CrownBot,
  client: Client,
  interaction: Interaction
) => {
  if (interaction.isSelectMenu()) {
    switch (interaction.customId) {
      case "help_menu" + bot.buttons_version:
        help_navigate(bot, interaction);
        break;
    }
    return;
  }

  const embed = new MessageEmbed()
    .addField(
      "Has the bot stopped showing your now-playing song?",
      "This almost always has nothing to do with the bot but with Last.fm—unless you misspelled your username (see `&mylogin` to ensure it's correct)."
    )
    .addField(
      "Things you can try",
      "Check [Last.fm status](https://twitter.com/lastfmstatus) to see if it's an issue with their servers; " +
        "if true, usually, you'll have to wait a few hours for scrobbles to catch up\n\n" +
        "(If you're using a 3rd-party Last.fm scrobbler, you're expected know how to disconnect and reconnect)\n\n" +
        "**If you use Spotify, (re)connect it to your Last.fm with these following steps:**\n" +
        "a. Login to <https://last.fm/>\n" +
        "b. Head over to <https://www.last.fm/settings/applications>\n" +
        "c. Find 'Spotify scrobbling', disconnect if it's already connected then reconnect\n" +
        "d. Go to your profile and make sure it's recording your plays correctly\n"
    )
    .addField(
      "Still no luck?",
      "The [support server](https://discord.gg/zzJ5zmA) might be able to help you."
    );

  if (interaction.isButton()) {
    switch (interaction.customId) {
      case "scrobblingfaq":
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    return;
  }
};
