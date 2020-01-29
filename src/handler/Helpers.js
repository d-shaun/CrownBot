const { stringify } = require("querystring");
const fetch = require("node-fetch");
const BotEmbed = require("../classes/BotEmbed");
const moment = require("moment");
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

  get_nowplaying: async (client, message, user, silent = false) => {
    const params = stringify({
      method: "user.getrecenttracks",
      user: user.username,
      api_key: client.apikey,
      format: "json"
    });
    const data = await fetch(`${client.url}${params}`).then(r => r.json());
    if (data.error) {
      if (!silent) {
        await message.reply(
          "something went wrong while trying to get info from last.fm."
        );
      }
      return false;
    }
    const last_track = data.recenttracks.track[0];
    if (last_track[`@attr`] && last_track[`@attr`].nowplaying) {
      return last_track;
    } else {
      if (!silent) {
        await message.reply("you aren't playing anything.");
      }
      return false;
    }
  },

  get_artistinfo: async ({
    client,
    message,
    artistName,
    user,
    silent,
    context
  }) => {
    let params = "";
    if (user) {
      params = stringify({
        method: "artist.getinfo",
        username: user.username,
        artist: artistName,
        api_key: client.apikey,
        format: "json",
        autocorrect: 1
      });
    } else {
      params = stringify({
        method: "artist.getinfo",
        artist: artistName,
        api_key: client.apikey,
        format: "json",
        autocorrect: 1
      });
    }

    const data = await fetch(`${client.url}${params}`).then(r => r.json());
    if (data.error) {
      if (!silent) {
        if (data.error === 6) {
          await message.reply("the artist could not be found.");
        } else {
          await message.reply(
            "something went wrong while trying to get info from last.fm."
          );
        }
      }
      return false;
    } else {
      if (context) {
        data.context = context;
      }
      return data;
    }
  },

  get_trackinfo: async ({
    client,
    message,
    artistName,
    songName,
    user,
    context
  }) => {
    const params = stringify({
      method: "track.getInfo",
      artist: artistName,
      track: songName,
      user: user ? user.username : null,
      api_key: client.apikey,
      format: "json",
      autocorrect: 1
    });
    const data = await fetch(`${client.url}${params}`).then(r => r.json());
    if (data.error) {
      await message.reply(`couldn't find the song.`);
      return false;
    } else {
      if (context) {
        data.context = context;
      }
      return data;
    }
  },

  get_guild_user: async ({ args, message }) => {
    if (args.length === 0) {
      return false;
    }
    const username = args.join().trim();
    let user = message.guild.members.find(member => {
      return member.user.username
        .toLowerCase()
        .startsWith(username.toLowerCase());
    });
    user = user ? user.user : false;
    return user;
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
    const { username, id } = user;
    await client.models.crowns.findOneAndUpdate(
      {
        artistName,
        guildID: guild.id
      },
      {
        userID: id,
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

  update_prefix: async ({ client, message, prefix }) => {
    const { guild, author } = message;
    const re = /^\S{1,4}$/g;
    if (!prefix.match(re)) {
      await message.reply("invalid prefix.");
      return;
    }
    await client.models.prefixes.findOneAndUpdate(
      {
        guildID: guild.id
      },
      {
        guildID: guild.id,
        prefix,
        guildName: guild.name
      },
      {
        upsert: true,
        useFindAndModify: false
      }
    );
    client.prefixes = false;
    await message.reply("the prefix is now set to ``" + prefix + "``.");
  },

  update_tracklog: async ({ client, message, track }) => {
    const { name, userplaycount } = track;
    const artistName = track.artist.name;
    const userID = message.author.id;
    const timestamp = moment.utc().valueOf();
    await client.models.tracklog.findOneAndUpdate(
      {
        name,
        artistName
      },
      {
        name,
        artistName,
        userplaycount,
        userID,
        timestamp
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
  },

  parse_difference: timestamp => {
    var then = moment.utc(timestamp);
    var now = moment();

    days = now.diff(then, "days");
    hours = now.subtract(days, "days").diff(then, "hours");
    minutes = now.subtract(hours, "hours").diff(then, "minutes");

    const string = `${days > 0 ? days + " day(s)" : ""} ${
      hours > 0 ? hours + " hour(s)" : ""
    } ${days < 1 && hours < 1 && minutes > 0 ? minutes + " minute(s)" : ""} ${
      days < 1 && hours < 1 && minutes < 1 ? "less than a minute" : ""
    }
    `.trim();
    return string;
  },

  // other
  notify: async ({ client, message, title, description, reply }) => {
    const embed = new BotEmbed(message)
      .setTitle(title)
      .setDescription(`\n${description}\n`);
    let sent_message;
    if (reply) {
      sent_message = await message.reply(embed);
    } else {
      sent_message = await message.channel.send(embed);
    }
    return sent_message;
  }
};
