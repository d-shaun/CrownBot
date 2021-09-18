import { MessageEmbed } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import Album from "../../handlers/LastFM_components/Album";
import User from "../../handlers/LastFM_components/User";
import Paginate from "../../handlers/Paginate";
import cb from "../../misc/codeblock";
import esm from "../../misc/escapemarkdown";

class TopAlbumTracks extends Command {
  constructor() {
    super({
      name: "topalbumtracks",
      description: "Displays user's top-played tracks in an album.",
      usage: [
        "topalbumtracks",
        "topalbumtracks  <album name> || <artist name>",
      ],
      aliases: ["tat", "tt", "tas"],
      extra_aliases: ["topalbumsongs", "tsa"],
      examples: ["tat In the Aeroplane Over the Sea"],
      require_login: true,
      category: "userstat",
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = bot.cache.prefix.get(message.guild);
    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(bot.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;

    const lastfm_user = new User({
      username: user.username,
    });

    let artist_name;
    let album_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(bot, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
      album_name = now_playing.album["#text"];
    } else {
      const str = args.join(" ");
      const str_array = str.split("||");
      if (str_array.length !== 2) {
        const query = await new Album({
          name: str_array.join().trim(),
          limit: 1,
        }).search();
        if (query.lastfm_errorcode || !query.success) {
          response.error("lastfm_error", query.lastfm_errormessage);
          return;
        }
        const album = query.data.results.albummatches.album[0];

        if (!album) {
          response.text = `Couldn't find the album; try providing artist name—see ${cb(
            "help tas",
            server_prefix
          )}.`;
          await response.send();
          return;
        }
        artist_name = album.artist;
        album_name = album.name;
      } else {
        album_name = str_array[0].trim();
        artist_name = str_array[1].trim();
      }
    }
    const query = await new Album({
      name: album_name,
      artist_name,
      username: user.username,
    }).user_get_info();
    if (query.lastfm_errorcode || !query.success) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }
    const album = query.data.album;
    const album_tracks = await lastfm_user.get_album_tracks(
      album.artist,
      album.name
    );
    if (!album_tracks) {
      response.text = new Template(bot, message).get("lastfm_error");
      await response.send();
      return;
    }
    if (!album_tracks.length) {
      response.text = "Couldn't find any track that you *may* have scrobbled.";
      await response.send();
      return;
    }

    const total_scrobbles = album_tracks.reduce((a, b) => a + b.plays, 0);
    const embed = new MessageEmbed()
      .setDescription(
        `Track plays — **${album_tracks.length}** tracks · **${total_scrobbles}** plays`
      )
      .setColor(message.member?.displayColor || 0x0)
      .setTitle(
        `${message.author.username}'s top-played tracks from the album ${cb(
          album.name
        )}`
      )
      .setFooter(`"${album.name}" by ${album.artist}`);
    const data_list = album_tracks.map((elem) => {
      return `${esm(elem.name)} — **${elem.plays} play(s)**`;
    });

    const paginate = new Paginate(message, embed, data_list);
    await paginate.send();
  }

  /*
  // uses the Last.fm API instead of scraping their pages
  async run_alternate(bot: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = bot.cache.prefix.get(message.guild);
    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(bot.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;

    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    let artist_name;
    let album_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(bot, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
      album_name = now_playing.album["#text"];
    } else {
      const str = args.join(" ");
      const str_array = str.split("||");
      if (str_array.length !== 2) {
        const { data } = await new LastFM().search_album(
          str_array.join().trim()
        );
        if (data.error) {
          response.text = new Template(bot, message).get("lastfm_error");
          await response.send();
          return;
        }
        const album = data.results.albummatches.album[0];

        if (!album) {
          response.text = `Couldn't find the album; try providing artist name—see ${cb(
            "help tat",
            server_prefix
          )}.`;
          await response.send();
          return;
        }
        artist_name = album.artist;
        album_name = album.name;
      } else {
        album_name = str_array[0].trim();
        artist_name = str_array[1].trim();
      }
    }
    const { data } = <AxiosResponse>await new LastFM().query({
      method: "album.getinfo",
      params: {
        album: album_name,
        artist: artist_name,
        username: user.username,
        autocorrect: 1,
      },
    });
    if (data.error || !data.album) {
      response.text = new Template(bot, message).get("lastfm_error");
      await response.send();
      return;
    }
    const album: AlbumInterface = data.album;
    const lastfm_requests = [];
    for (const track of album.tracks.track) {
      lastfm_requests.push(
        new LastFM().query({
          method: "track.getinfo",
          params: {
            artist: track.artist.name,
            track: track.name,
            username: user.username,
            autocorrect: 1,
          },
        })
      );
    }
    if (lastfm_requests.length > 100) {
      lastfm_requests.length = 100; // 100 tracks limit
    }
    let responses: ResponseInterface[] = [];
    await Promise.all(lastfm_requests).then((res) => (responses = res));
    if (!responses.length) {
      response.text = `The album ${cb(album.name)} by ${cb(
        album.artist
      )} has no tracks registered on Last.fm.`;
      await response.send();
      return;
    }
    if (responses.some((response) => !response.data || !response.data.track)) {
      response.text = new Template(bot, message).get("lastfm_error");
      await response.send();
      return;
    }

    responses = responses
      .filter((response) => response.status !== 404)
      .filter((response) => {
        // filter out users who have deleted their Last.fm account
        const track: TrackInterface = response.data.track;
        return !(track && !track.userplaycount);
      });
    const tracks: TrackInterface[] = responses
      .map((response) => response.data.track)
      .filter((track) => parseInt(track.userplaycount) > 0)
      .sort((a, b) => parseInt(b.userplaycount) - parseInt(a.userplaycount));
    if (!tracks.length) {
      response.text = `Couldn't find any track that you *may* have scrobbled from the album ${cb(
        album.name
      )} by ${cb(album.artist)}.`;
      await response.send();
      return;
    }
    const total_scrobbles = tracks.reduce(
      (a, b) => a + parseInt(<string>b.userplaycount),
      0
    );

    const fields_embed = new FieldsEmbed()
      .setArray(tracks)
      .setAuthorizedUsers([])
      .setChannel(<TextChannel>message.channel)
      .setElementsPerPage(15)
      .setPageIndicator(true)
      .setDisabledNavigationEmojis(["delete"])
      .formatField(`Track plays — Total: ${total_scrobbles}`, (el: any) => {
        const elem: TrackInterface = el;
        if (elem.userplaycount === undefined) return;
        const index = tracks.findIndex((e) => e.name === elem.name) + 1;
        const user_percentage = (
          (parseInt(elem.userplaycount) / total_scrobbles) *
          100
        ).toFixed(2);
        return `${index}. ${elem.name} — **${elem.userplaycount} play(s)** — ${user_percentage}%`;
      });
    fields_embed.embed
      .setColor(message.member?.displayColor || "000000")
      .setTitle(
        `${message.author.username}'s top-played tracks from the album ${cb(
          album.name
        )}`
      )
      .setFooter(`${album.name}—${album.artist}`);
    fields_embed.on("start", () => {
      message.channel.stopTyping(true);
    });
    await fields_embed.build();
  }
  */
}

export default TopAlbumTracks;
