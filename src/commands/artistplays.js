const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");
const BotEmbed = require("../classes/BotEmbed");
const abbreviate = require("number-abbreviate");
class ArtistPlaysCommand extends Command {
  constructor() {
    super({
      name: "artistplays",
      description: "Displays user's play count of an artist.",
      usage: ["artistplays", "artistplays <artist name>"],
      aliases: ["a", "ap", "apl"],
      examples: ["artistplays Devin Townsend", "artistplays Joy Division"]
    });
  }

  async run(client, message, args) {
    const server_prefix = client.getCachedPrefix(message);

    // "getters"
    const { get_username, get_nowplaying, get_artistinfo } = client.helpers;

    // "setters"
    const { update_artistlog } = client.helpers;

    // parsers
    const { parse_artistinfo, parse_difference } = client.helpers;

    let artistName = null;

    const user = await get_username(client, message);
    if (!user) return;

    if (args.length === 0) {
      const now_playing = await get_nowplaying(client, message, user);
      if (!now_playing) return;
      artistName = now_playing.artist[`#text`];
    } else {
      artistName = args.join(` `);
    }

    const { artist } = await get_artistinfo({
      client,
      message,
      artistName,
      user
    });
    if (!artist) return;
    const { name, userplaycount, playcount } = parse_artistinfo(artist);

    var last_played = 0;
    var count_diff_str = "No change";
    var time_diff_str = false;
    var last_log = await client.models.artistlog.findOne({
      name,
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
    await update_artistlog({
      client,
      message,
      artist
    });

    const percentage = ((userplaycount / playcount) * 100).toFixed(2);
    const embed = new BotEmbed(message)
      .setTitle(`Artist plays`)
      .setDescription(
        `**${name}** — **${userplaycount} play(s)** \n\n (**${percentage}%** of ${abbreviate(
          playcount,
          1
        )} plays) \n\n ${aggr_str}`
      );
    await message.channel.send(embed);
  }
}

module.exports = ArtistPlaysCommand;
