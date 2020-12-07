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

const {
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
new CrownBot({
  prefix: "&",
  token: TOKEN,
  owner_ID: OWNER_ID,
  api_key: API_KEY,
  access_token: ACCESS_TOKEN,
  mongo: MONGO,
  genius_api: GENIUS_API,
}).init();

// debugger;
