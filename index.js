const Bot = require('./src/handler/CrownBot')
const { prefix, token, ownerID, apikey, mongo } = require('./config.json')

const bot = new Bot({
    prefix, token, ownerID, apikey, mongo
})

bot.init()