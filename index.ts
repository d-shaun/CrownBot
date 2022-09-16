import { Client, GatewayIntentBits, Interaction } from "discord.js";
import fs from "fs";
import path from "path";
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
      version: "10.0.0",
      prefix: "&",
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
      intents: [
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.Guilds,
      ],
    });

    // register events
    client.once("interactionCreate", (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return;
      // console.log(bot);
      const command = bot.commands.find(
        (e) => e.name == interaction.commandName
      );
      console.log(command);
      if (command) command.execute(bot, client, interaction);
    });
    // const dir: string = path.join(__dirname, "./src/events");
    // const events: string[] = fs.readdirSync(dir);
    // events.forEach((file: string) => {
    //   const [eventName]: string[] = file.split(".");
    //   const props = require(path.join(dir, file));
    //   console.log(bot);
    //   console.log(client);

    //   client.on(eventName, props.default.bind(null, null, null, null));
    // });

    await client.login(TOKEN);
    console.log(`Logged in as ${client.user?.tag}`);
  } catch (e) {
    console.log(e);
    debugger; //eslint-disable-line
  }
})();
