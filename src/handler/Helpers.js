const { stringify } = require("querystring");
const fetch = require("node-fetch");
const BotEmbed = require("../classes/BotEmbed");

module.exports = {
  // anything get goes here
  get_username: async (client, message, silent = false) => {
    const { users } = client.models;
    const user = await users.findOne({
      userID: message.author.id
    });
    if (!user) {
      if (!silent) {
        await message.reply(
          "please set your last.fm username with the ``&login`` command first."
        );
      }
      return false;
    } else {
      return user;
    }
  },

  get_nowplaying: async (client, message, user) => {
    const params = stringify({
      method: "user.getrecenttracks",
      user: user.username,
      api_key: client.apikey,
      format: "json"
    });
    const data = await fetch(`${client.url}${params}`).then(r => r.json());
    if (data.error) {
      await message.reply(
        "something went wrong while trying to get info from last.fm."
      );

      return false;
    }
    const last_track = data.recenttracks.track[0];
    if (last_track[`@attr`] && last_track[`@attr`].nowplaying) {
      return last_track;
    } else {
      await message.reply("you aren't playing anything.");
      return false;
    }
  },

  get_artistinfo: async ({ client, message, artistName, user }) => {
    let params = "";
    if (user) {
      params = stringify({
        method: "artist.getinfo",
        username: user.username,
        artist: artistName,
        api_key: client.apikey,
        format: "json"
      });
    } else {
      params = stringify({
        method: "artist.getinfo",
        artist: artistName,
        api_key: client.apikey,
        format: "json"
      });
    }

    const data = await fetch(`${client.url}${params}`).then(r => r.json());
    if (data.error) {
      if (data.error === 6) {
        await message.reply("the artist could not be found.");
      } else {
        await message.reply(
          "something went wrong while trying to get info from last.fm."
        );
      }

      return false;
    } else {
      return data;
    }
  },

  get_trackinfo: async ({ client, message, artistName, songName, user }) => {
    const params = stringify({
      method: "track.getInfo",
      artist: artistName,
      track: songName,
      user: (user ? user.username : null),
      api_key: client.apikey,
      format: "json"
    });
    const data = await fetch(`${client.url}${params}`).then(r => r.json());
    if (data.error) {
      await message.reply(`couldn't find the song.`);
      return false;
    } else {
      return data;
    }
  },

  //anything updating goes here

  update_usercrown: async ({
    client,
    message,
    artistName,
    userplaycount,
    user
  }) => {
    const { guild } = message;
    const { username, userID } = user;
    await client.models.crowns.findOneAndUpdate(
      {
        artistName,
        guildID: guild.id
      },
      {
        userID: userID,
        guildID: guild.id,
        artistPlays: userplaycount,
        lastfm_username: username
      },
      {
        upsert: true,
        useFindAndModify: false
      }
    );
  },

  update_userplays: async ({
    client,
    message,
    artistName,
    userplaycount,
    user
  }) => {
    const { author, guild } = message;
    const { username } = user;
    await client.models.userplays.findOneAndUpdate(
      {
        artistName,
        userID: author.id
      },
      {
        userID: author.id,
        guildID: guild.id,
        discord_username: author.tag,
        lastfm_username: username,
        artistName,
        artistPlays: userplaycount
      },
      {
        upsert: true,
        useFindAndModify: false
      }
    );
  },

  // anything checking goes here

  check_permissions: message => {
    if (!message.guild.me.hasPermission("MANAGE_MESSAGES")) {
      message.reply(
        "the ``MANAGE_MESSAGES`` permission is required for this command to work."
      );
      return false;
    }
    return true;
  },

  // anything parsing goes here
  parse_artistinfo: artist => {
    const { name, url } = artist;
    const { listeners, playcount, userplaycount } = artist.stats;
    return {
      name,
      url,
      userplaycount,
      listeners,
      playcount
    };
  },
  parse_trackinfo: track => {
    const { name, url, userplaycount, listeners, playcount, artist } = track;
    return {
      name,
      artist,
      url,
      userplaycount,
      listeners,
      playcount
    };
  }
};
