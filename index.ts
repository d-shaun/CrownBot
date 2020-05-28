import CrownBot from "./src/handlers/CrownBot";
const { TOKEN, OWNER_ID, API_KEY, ACCESS_TOKEN, MONGO } = process.env;
if (!(TOKEN && OWNER_ID && API_KEY && ACCESS_TOKEN && MONGO)) {
  throw "Some of the environment variables are missing.";
}
new CrownBot({
  prefix: "&",
  token: TOKEN,
  owner_ID: OWNER_ID,
  api_key: API_KEY,
  access_token: ACCESS_TOKEN,
  mongo: MONGO,
}).init();

// debugger;
