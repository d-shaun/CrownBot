const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");
const BotEmbed = require("../classes/BotEmbed");
const abbreviate = require("number-abbreviate");
const Pagination = require("discord-paginationembed");

class TopAlbumsCommand extends Command {
  constructor() {
    super({
      name: "topalbums",
      description: "Displays user's top-played albums of an artist.",
      usage: ["topalbums", "topalbums <artist name>"],
      aliases: ["ta", "tp", "tpa"],
      examples: ["topalbums Devin Townsend"]
    });
  }

  async run(client, message, args) {
    const server_prefix = client.getCachedPrefix(message);

    // "getters"
    const {
      get_username,
      get_nowplaying,
      get_artistinfo,
      get_albuminfo
    } = client.helpers;

    // parsers
    const { parse_artistinfo } = client.helpers;

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
    const { name } = parse_artistinfo(artist);
    const params = stringify({
      artist: name,
      method: "artist.getTopAlbums",
      api_key: client.apikey,
      format: "json",
      limit: 30
    });
    const { topalbums } = await fetch(`${client.url}${params}`).then(r =>
      r.json()
    );
    if (!topalbums) return;

    let lastfm_requests = [];
    topalbums.album.forEach(album => {
      lastfm_requests.push(
        get_albuminfo({
          client,
          message,
          artistName: name,
          albumName: album.name,
          user,
          silent: true
        })
      );
    });

    var responses;
    await Promise.all(lastfm_requests).then(res => (responses = res));

    responses = responses.filter(res => res && res.album);

    const sorted_list = responses
      .filter(({ album }) => album.userplaycount > 0)
      .map(({ album }) => {
        const { name, userplaycount } = album;
        return { name, userplaycount };
      })
      .sort((a, b) => parseInt(b.userplaycount) - parseInt(a.userplaycount));

    const FieldsEmbed = new Pagination.FieldsEmbed()
      .setArray(sorted_list)
      .setAuthorizedUsers([])
      .setChannel(message.channel)
      .setElementsPerPage(15)
      .setPageIndicator(true)
      .setDisabledNavigationEmojis(["DELETE"])
      .formatField(`Album plays`, (el, i) => {
        const index = sorted_list.findIndex(e => e.name == el.name) + 1;
        return `${index}. ${el.name} — **${el.userplaycount} play(s)**`;
      });
    FieldsEmbed.embed
      .setColor(message.member.displayColor)
      .setTitle(`${message.author.username}'s top-played albums by \`${name}\``)
      .setFooter(`Psst, try ${server_prefix}about to find the support server.`);
    await FieldsEmbed.build();
  }
}

module.exports = TopAlbumsCommand;
