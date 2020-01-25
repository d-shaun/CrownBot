const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");
const BotEmbed = require("../classes/BotEmbed");
const abbreviate = require("number-abbreviate");
class SongPlaysCommand extends Command {
  constructor() {
    super({
      name: "songplays",
      description: "Displays user's play count of a song.",
      usage: ["songplays", "songplays <artist name>"],
      aliases: ["spl"]
    });
  }

  async run(client, message, args) {
    const server_prefix = client.getCachedPrefix(message);

    // "getters"
    const { get_username, get_nowplaying, get_trackinfo } = client.helpers;

    // "setters"
    const { update_tracklog } = client.helpers;

    // parsers
    const { parse_trackinfo, parse_difference } = client.helpers;

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
            "spl <song name>||<artist name>``. (Example: ``" +
            server_prefix +
            "spl Sylvia||The Antlers``.)"
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
      songName,
      user
    });

    if (!track) return;
    let { name, artist, userplaycount, playcount } = parse_trackinfo(track);
    var last_played = 0;
    var count_diff_str = "No change";
    var time_diff_str = false;
    var last_log = await client.models.tracklog.findOne({
      name,
      artistName: artist.name,
      userID: message.author.id
    });

    if (last_log) {
      last_played = last_log.userplaycount;
      time_diff_str = await parse_difference(last_log.timestamp);
    }

    const count_diff = userplaycount - last_played;

    if (count_diff < 0) {
      count_diff_str = `:small_red_triangle_down: ${count_diff}`;
    } else if (count_diff > 0) {
      count_diff_str = `+${count_diff}`;
    }
    let aggr_str = `**${count_diff_str}** since last checked ${time_diff_str} ago.`;
    if (!time_diff_str) {
      aggr_str = "";
    }
    await update_tracklog({
      client,
      message,
      track
    });
    const percentage = ((userplaycount / playcount) * 100).toFixed(2);
    const embed = new BotEmbed(message)
      .setTitle(`Track plays`)
      .setDescription(
        `**${name}** by **${
          artist.name
        }** — ${userplaycount} play(s) \n\n (**${percentage}%** of ${abbreviate(
          playcount,
          1
        )} plays) \n\n ${aggr_str}`
      );
    await message.channel.send(embed);
  }
}

module.exports = SongPlaysCommand;
