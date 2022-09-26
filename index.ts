import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Interaction,
} from "discord.js";
import { preflight_checks } from "./src/classes/Command";
import GuildChatInteraction from "./src/classes/GuildChatInteraction";
import { handle_editlyrics } from "./src/commands/owner_commands/editlyrics";
import CrownBot from "./src/handlers/CrownBot";
import handle_bugreport from "./src/misc/handle_bugreport";
/*
# REQUIRED
======================================================================================================
TOKEN: Discord API token
OWNER_ID: User ID of the bot owner
API_KEY: Last.fm API key
MONGO: Mongo DB connection string
======================================================================================================

# OPTIONAL
ACCESS_TOKEN: Deezer access token—used to be used in the topalbums command; no longer required.
GENIUS_API: Genius API for the &lyrics command.
SPOTIFY_CLIENTID: Spotify client ID for the &chart command to show artist images
SPOTIFY_SECRETID: Spotify client ID for the &chart command to show artist images
*/

(async () => {
  try {
    const {
      CLIENT_ID,
      TOKEN,
      OWNER_ID,
      API_KEY,
      ACCESS_TOKEN,
      MONGO,
      GENIUS_API,
    } = process.env;
    if (!(TOKEN && OWNER_ID && API_KEY && MONGO)) {
      throw "Some of the environment variables are missing.";
    }

    const bot = await new CrownBot({
      version: "11.0.0-beta",
      buttons_version: "001", // update this to invalidate existing buttons
      max_users: 250, // max user-support per server

      client_id: CLIENT_ID,
      token: TOKEN,
      owner_ID: OWNER_ID,
      api_key: API_KEY,
      access_token: ACCESS_TOKEN,
      mongo: MONGO,
      genius_api: GENIUS_API,

      url: "https://ws.audioscrobbler.com/2.0/?",
    }).init_dev();

    const client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    // register events
    client.on("interactionCreate", async (interaction: Interaction) => {
      if (interaction.isButton()) {
        const embed = new EmbedBuilder().addFields([
          {
            name: "Has the bot stopped showing your now-playing song?",
            value:
              "This almost always has nothing to do with the bot but with Last.fm—unless you misspelled your username (see `/mylogin` to ensure it's correct).",
          },
          {
            name: "Things you can try",
            value:
              "Check [Last.fm status](https://twitter.com/lastfmstatus) to see if it's an issue with their servers; " +
              "if true, usually, you'll have to wait a few hours for scrobbles to catch up\n\n" +
              "(If you're using a 3rd-party Last.fm scrobbler, you're expected know how to disconnect and reconnect)\n\n" +
              "**If you use Spotify, (re)connect it to your Last.fm with these following steps:**\n" +
              "a. Login to <https://last.fm/>\n" +
              "b. Head over to <https://www.last.fm/settings/applications>\n" +
              "c. Find 'Spotify scrobbling', disconnect if it's already connected then reconnect\n" +
              "d. Go to your profile and make sure it's recording your plays correctly\n",
          },
          {
            name: "Still no luck?",
            value:
              "The [support server](https://discord.gg/zzJ5zmA) might be able to help you.",
          },
        ]);

        switch (interaction.customId) {
          case "scrobblingfaq":
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        return;
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId === "bugmodal")
          await handle_bugreport(bot, client, interaction);
        else if (interaction.customId === "lyricsmodal")
          await handle_editlyrics(bot, client, interaction);
        return;
      }
      if (!interaction.isChatInputCommand()) return;
      if (!interaction.guild) return;

      const command = bot.commands.find(
        (e) => e.data.name == interaction.commandName
      );

      if (!command) return;

      try {
        await preflight_checks(
          bot,
          client,
          <GuildChatInteraction>interaction,
          command
        );
      } catch (e: any) {
        console.error(e);
      }
    });

    // TEMPORARY NOTICE OF THE BOT SWITCHING TO SLASH COMMANDS
    // register events
    // client.on("messageCreate", async (message: Message) => {
    //   await send_temp_notice(message, bot);
    // });

    await client.login(TOKEN);
    console.log(`Logged in as ${client.user?.tag}`);
  } catch (e) {
    console.log(e);
    debugger; //eslint-disable-line
  }
})();
