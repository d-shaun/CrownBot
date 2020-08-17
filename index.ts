import CrownBot from "./src/handlers/CrownBot";

/*

TOKEN: Discord API token
OWNER_ID: User ID of the bot owner
API_KEY: Last.fm API key
ACCESS_TOKEN: Deezer access token—used to be used in the topalbums command; no longer required.
MONGO: Mongo DB connection string

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
