const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");
const BotEmbed = require("../classes/BotEmbed");
const Pagination = require("discord-paginationembed");
class WhoPlaysCommand extends Command {
  constructor() {
    super({
      name: "whoplays",
      description: "Checks if anyone in a guild listens to a certain track. ",
      usage: ["whoplays", "whoplays <song name> || <artist name>"],
      aliases: ["wp"]
    });
  }

  async run(client, message, args) {
    const server_prefix = client.getCachedPrefix(message);

    const { users, bans } = client.models;

    // "getters"
    const { get_username, get_nowplaying, get_trackinfo } = client.helpers;

    // parsers
    const { parse_trackinfo } = client.helpers;

    // checks
    const { check_permissions } = client.helpers;

    const has_required_permissions = check_permissions(message);

    if (!has_required_permissions) return;

    let songName;
    let artistName;
    const user = await get_username(client, message);
    if (!user) return;
    if (args.length === 0) {
      const now_playing = await get_nowplaying(client, message, user);
      if (!now_playing) return;
      artistName = now_playing.artist[`#text`];
      songName = now_playing.name;
    } else {
      let str = args.join(` `);
      let str_array = str.split("||");
      if (str_array.length !== 2) {
        await message.reply(
          "invalid format; try ``" +
            server_prefix +
            "wp <song name>||<artist name>``. (Example: ``" +
            server_prefix +
            "wp Sylvia||The Antlers``.)"
        );
        return;
      }
      songName = str_array[0].trim();
      artistName = str_array[1].trim();
    }

    let { track } = await get_trackinfo({
      client,
      message,
      artistName,
      songName
    });
    if (!track) return;
    const guild = await message.guild.fetchMembers();
    const ids = guild.members.map(e => e.id);
    let registered_guild_users = await users
      .find({
        userID: {
          $in: ids
        }
      })
      .lean();

    let banned_users = await bans
      .find({
        userID: { $in: ids },
        guildID: { $in: [message.guild.id, "any"] }
      })
      .lean();
    banned_users = banned_users.map(user => user.userID);
    registered_guild_users = registered_guild_users.filter(
      user => !banned_users.includes(user.userID)
    );

    if (registered_guild_users.length <= 0) {
      await message.reply(
        "no user in this guild has registered their Last.fm username."
      );
      return;
    }
    if (registered_guild_users.length > 30) {
      registered_guild_users.length = 30;
    }
    let unsorted_leaderboard = [];
    let proper_artistName = track.artist.name;
    let proper_trackName = track.name;

    var lastfm_requests = [];
    for await (const user of registered_guild_users) {
      const context = {
        discord_user: guild.members.find(e => e.id === user.userID)
      };
      lastfm_requests.push(
        get_trackinfo({
          client,
          message,
          artistName,
          songName,
          user,
          context
        })
      );
    }

    var responses;
    await Promise.all(lastfm_requests).then(res => (responses = res));

    if (
      responses.some(response => {
        const { track } = response;
        const { userplaycount } = parse_trackinfo(track);
        return userplaycount === undefined;
      })
    ) {
      await message.reply(
        "failed to get info from Last.fm; try again after a while."
      );
      return;
    }

    responses.forEach(({ track, context }) => {
      let user = context.discord_user.user;
      let discord_username = user.username;

      const { name, userplaycount } = parse_trackinfo(track);

      if (userplaycount <= 0) {
        return;
      }

      unsorted_leaderboard.push({
        discord_username,
        userplaycount,
        user
      });
    });

    if (unsorted_leaderboard.length <= 0) {
      await message.reply(
        "no one here has played ``" +
          proper_trackName +
          "`` by ``" +
          proper_artistName +
          "``."
      );
      return;
    }

    const leaderboard = unsorted_leaderboard.sort(
      (a, b) => parseInt(b.userplaycount) - parseInt(a.userplaycount)
    );

    const total_scrobbles = leaderboard.reduce(
      (a, b) => a + parseInt(b.userplaycount),
      0
    );
    const FieldsEmbed = new Pagination.FieldsEmbed()
      .setArray(leaderboard)
      .setAuthorizedUsers([])
      .setChannel(message.channel)
      .setElementsPerPage(15)
      .setPageIndicator(true)
      .setDisabledNavigationEmojis(["DELETE"])
      .formatField(
        `Total: ${total_scrobbles} plays`,
        el =>
          `${leaderboard.findIndex(e => e.user.id == el.user.id) + 1}. ${
            el.discord_username
          } — **${el.userplaycount} play(s)**`
      );

    FieldsEmbed.embed
      .setColor(0x00ffff)
      .setTitle(
        `Who plays \`\`${proper_trackName}\`\` by \`\`${proper_artistName}\`\` in ${message.guild.name}?`
      )
      .setFooter(`Psst, try ${server_prefix}about to find the support server.`);
    FieldsEmbed.build();
  }
}

module.exports = WhoPlaysCommand;
