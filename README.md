## CrownBot

[![GitHub last commit](https://img.shields.io/github/last-commit/d-shaun/CrownBot?style=flat)]()
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/05249f00a07e4a1ca3f816daca6b1094)](https://app.codacy.com/manual/d-shaun/CrownBot)
[![Discord](https://img.shields.io/discord/657915913567469588.svg?label=Discord)](https://discord.gg/zzJ5zmA)

![CrownBot profile picture](https://i.imgur.com/a6zovhE.png)

A Discord bot that uses the Last.fm API to track scrobbles and rank users.

Commands and FAQs: <https://d-shaun.github.io/cbdocs/>.

### Invite link

<https://discordapp.com/api/oauth2/authorize?client_id=636075999154536449&permissions=288832&scope=bot>

### Support server

<https://discord.gg/zzJ5zmA>

## Self-hosting instructions

### Requirements

- A Discord API token: see <https://discord.com/developers/docs/topics/oauth2#shared-resources>.

- Your (bot owner's) Discord ID: you need to specify this for the "owner only" commands to work. ([Learn how to get it](https://support.discord.com/hc/en-us/articles/206346498))

- A Last.fm API key: you'll need to create an ["API account"](https://www.last.fm/api/) on Last.fm.

- A MongoDB connection string; this is how:
  - On the "Cluster" section, click the "CONNECT" button and then "Connect your application."
  - Copy the string and replace `<password>` with password and `<dbname>` with the database name.
    (See the [reference page](https://docs.mongodb.com/manual/reference/connection-string/) from MongoDB.)

### Initial setup

- Download the source code of the version you want to use from [releases](https://github.com/d-shaun/CrownBot/releases) and extract that.
- Open up a terminal in the extracted folder and run either `npm install` or `yarn install` to install the required packages.
- Add the following environment variables:

  - `TOKEN`: Discord API token
  - `OWNER_ID`: User ID of the bot owner
  - `API_KEY`: Last.fm API key
  - `MONGO`: Mongo DB connection string

    If you don't know how to do that, see: <https://medium.com/the-node-js-collection/2da8cdf6e786>.

- Run `npm run build && npm run start` in the console to build the project with TypeScript and start running the bot.
