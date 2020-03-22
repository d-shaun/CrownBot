const Bot = require("./src/handler/CrownBot");
const {
  prefix,
  token,
  ownerID,
  apikey,
  mongo,
  client_id,
  client_secret
} = require("./config.json");

const bot = new Bot({
  prefix,
  token,
  ownerID,
  apikey,
  mongo,
  client_id,
  client_secret
});

bot.init();
