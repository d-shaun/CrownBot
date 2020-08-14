import { AxiosResponse } from "axios";
import { FieldsEmbed } from "discord-paginationembed";
import { Message, TextChannel } from "discord.js";
import Command from "../classes/Command";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import { LastFM } from "../handlers/LastFM";
import LastFMUser from "../handlers/LastFMUser";
import { AlbumInterface } from "../interfaces/AlbumInterface";
import { TrackInterface } from "../interfaces/TrackInterface";
import cb from "../misc/codeblock";
class TopAlbumSongs extends Command {
  constructor() {
    super({
      name: "topalbumsongs",
      description: "Displays user's top-played tracks in an album.",
      usage: ["topalbumsongs", "topalbumsongs  <album name> || <artist name>"],
      aliases: ["tas", "tsa"],
      examples: ["tas In the Aeroplane Over the Sea"],
      require_login: true,
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.author.id);
    if (!user) return;

    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    let artist_name;
    let album_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(client, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
      album_name = now_playing.album["#text"];
    } else {
      let str = args.join(" ");
      let str_array = str.split("||");
      if (str_array.length !== 2) {
        const { status, data } = await new LastFM().search_album(
          str_array.join().trim()
        );
        if (data.error) {
          response.text = new Template(client, message).get("lastfm_error");
          await response.send();
          return;
        }
        let album = data.results.albummatches.album[0];

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
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    const album: AlbumInterface = data.album;
    const album_tracks = await lastfm_user.get_album_tracks(
      album.artist,
      album.name
    );
    if (!album_tracks) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    if (!album_tracks.length) {
      response.text = "Couldn't find any tracks that you *may* have scrobbled.";
      await response.send();
      return;
    }

    const total_scrobbles = album_tracks.reduce((a, b) => a + b.plays, 0);

    const fields_embed = new FieldsEmbed()
      .setArray(album_tracks)
      .setAuthorizedUsers([])
      .setChannel(<TextChannel>message.channel)
      .setElementsPerPage(15)
      .setPageIndicator(true, "hybrid")
      .setDisabledNavigationEmojis(["delete"])
      .formatField(
        `Track plays — ${album_tracks.length} tracks · ${total_scrobbles} plays`,
        (el: any) => {
          const elem: {
            name: string;
            plays: number;
          } = el;
          const index = album_tracks.findIndex((e) => e.name === elem.name) + 1;
          return `${index}. ${elem.name} — **${elem.plays} play(s)**`;
        }
      );
    fields_embed.embed
      .setColor(message.member?.displayColor || "000000")
      .setTitle(
        `${message.author.username}'s top-played tracks from the album ${cb(
          album.name
        )}`
      )
      .setFooter(`${album.name}—${album.artist}`);

    fields_embed.on("start", () => {
      message.channel.stopTyping();
    });
    await fields_embed.build();
  }

  // uses the Last.fm API instead of scraping their pages
  async run_alternate(client: CrownBot, message: Message, args: String[]) {
    const server_prefix = client.get_cached_prefix(message);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.author.id);
    if (!user) return;

    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    let artist_name;
    let album_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(client, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
      album_name = now_playing.album["#text"];
    } else {
      let str = args.join(" ");
      let str_array = str.split("||");
      if (str_array.length !== 2) {
        const { status, data } = await new LastFM().search_album(
          str_array.join().trim()
        );
        if (data.error) {
          response.text = new Template(client, message).get("lastfm_error");
          await response.send();
          return;
        }
        let album = data.results.albummatches.album[0];

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
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    const album: AlbumInterface = data.album;
    let lastfm_requests = [];
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
    let responses: AxiosResponse[] = [];
    await Promise.all(lastfm_requests).then((res) => (responses = res));
    if (!responses.length) {
      response.text = `The album ${cb(album.name)} by ${cb(
        album.artist
      )} has no tracks registered on Last.fm.`;
      await response.send();
      return;
    }
    if (responses.some((response) => !response.data || !response.data.track)) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    responses = responses
      .filter((response: AxiosResponse) => response.status !== 404)
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
        if (!elem.userplaycount) return;
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
      message.channel.stopTyping();
    });
    await fields_embed.build();
  }
}

export default TopAlbumSongs;
