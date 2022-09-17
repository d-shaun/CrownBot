import { Client, GatewayIntentBits, Interaction } from "discord.js";
import { preflight_checks } from "./src/classes/Command";
import GuildChatInteraction from "./src/classes/GuildChatInteraction";
import CrownBot from "./src/handlers/CrownBot";
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
    const { TOKEN, OWNER_ID, API_KEY, ACCESS_TOKEN, MONGO, GENIUS_API } =
      process.env;
    if (!(TOKEN && OWNER_ID && API_KEY && MONGO)) {
      throw "Some of the environment variables are missing.";
    }

    const bot = await new CrownBot({
      version: "11.0.0",
      buttons_version: "001", // update this to invalidate existing buttons
      max_users: 250, // max user-support per server

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

    await client.login(TOKEN);
    console.log(`Logged in as ${client.user?.tag}`);
  } catch (e) {
    console.log(e);
    debugger; //eslint-disable-line
  }
})();
