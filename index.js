const Bot = require("./src/handler/CrownBot");
const {
  prefix,
  token,
  ownerID,
  apikey,
  mongo,
  access_token
} = require("./config.json");

const bot = new Bot({
  prefix,
  token,
  ownerID,
  apikey,
  mongo,
  access_token
});

bot.init();
