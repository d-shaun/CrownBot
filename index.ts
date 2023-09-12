import { Client, GatewayIntentBits, Interaction, Options } from "discord.js";
import path from "path";
import GLOBALS from "./GLOBALS";
import GuildChatInteraction from "./src/classes/GuildChatInteraction";
import { preflight_checks } from "./src/handlers/Command";
import { CommandResponse } from "./src/handlers/CommandResponse";
import CrownBot from "./src/handlers/CrownBot";
import handle_autocomplete from "./src/handlers/handle_autocomplete";
import { handle_button } from "./src/handlers/handle_button";
import {
  handle_editconfig,
  handle_reportbug,
} from "./src/handlers/handle_modal";
/*
# REQUIRED
======================================================================================================
DISCORD_CLIENTID: Bot's client ID
DISCORD_TOKEN: Discord API token
OWNER_ID: User ID of the bot owner
LASTFM_API_KEY: Last.fm API key
MONGO: Mongo DB connection string
======================================================================================================


LYRICS_ENDPOINT: Lyrics endpoint for the /lyrics command--command won't work unless this is set. 
    Setup a server to use it as:
     <server>?gquery=<query string>
    That <server> needs to be in the environment variable as LYRICS_ENDPOINT. /lyrics appends `?gquery=<query string>` to it.
    Example, set it to https://mycoolsite.com/lyrics (only add trailing / when necessary) and it becomes https://mycoolsite.com/lyrics?gquery=something 


SPOTIFY_CLIENTID: Spotify client ID for the /chart command to show artist images
SPOTIFY_SECRETID: Spotify client ID for the /chart command to show artist images
*/

(<any>global).appRoot = path.resolve(__dirname);

(async () => {
  try {
    const { DISCORD_CLIENTID, DISCORD_TOKEN, OWNER_ID, LASTFM_API_KEY, MONGO } =
      process.env;
    if (
      !(
        DISCORD_TOKEN &&
        OWNER_ID &&
        LASTFM_API_KEY &&
        MONGO &&
        DISCORD_CLIENTID
      )
    ) {
      throw "Some of the environment variables are missing.";
    }

    const bot = await new CrownBot({
      version: GLOBALS.VERSION,
      buttons_version: GLOBALS.BUTTONS_VERSION,
      max_users: GLOBALS.MAX_USERS,

      client_id: DISCORD_CLIENTID,
      token: DISCORD_TOKEN,
      owner_ID: OWNER_ID,
      api_key: LASTFM_API_KEY,
      mongo: MONGO,

      url: GLOBALS.LASTFM_ENDPOINT,
    }).init();

    const client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences],
      makeCache: Options.cacheWithLimits({
        ReactionManager: 0,
        GuildMemberManager: 0,
        MessageManager: 0,
        GuildEmojiManager: 0,
        ThreadManager: 0,
        ThreadMemberManager: 0,
      }),
    });

    // register events
    client.on("interactionCreate", async (interaction: Interaction) => {
      if (interaction.isAutocomplete()) {
        await handle_autocomplete(bot, client, interaction);
      }

      if (interaction.isButton()) {
        await handle_button(bot, client, interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId === "bugmodal")
          await handle_reportbug(bot, client, interaction);
        else if (interaction.customId === "configmodal")
          await handle_editconfig(bot, client, interaction);
        return;
      }
      if (!interaction.isChatInputCommand()) return;
      if (!interaction.guild) return;

      const command = bot.commands.find(
        (e) => e.data.name == interaction.commandName
      );

      if (!command) return;

      try {
        const response = new CommandResponse(bot, client, <any>interaction);
        response.text;
        const command_response = await preflight_checks(
          bot,
          client,
          <GuildChatInteraction>interaction,
          command,
          response
        );
        if (
          typeof command_response == "object" &&
          command_response instanceof CommandResponse
        ) {
          await command_response.reply();
        }
      } catch (e: any) {
        console.error(e);
      }
    });

    await client.login(DISCORD_TOKEN);
    console.log(`Logged in as ${client.user?.tag}`);
  } catch (e) {
    console.log(e);
    debugger; //eslint-disable-line
  }
})();
