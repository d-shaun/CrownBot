import axios from "axios";
import { FieldsEmbed } from "discord-paginationembed";
import { Message, TextChannel } from "discord.js";
import Command from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import { LastFM } from "../../handlers/LastFM";
import LastFMUser from "../../handlers/LastFMUser";
import {
  AlbumInterface,
  TopAlbumInterface,
} from "../../interfaces/AlbumInterface";
import { ArtistInterface } from "../../interfaces/ArtistInterface";
import { DeezerAlbumInterface } from "../../interfaces/DeezerAlbumInterface";
import cb from "../../misc/codeblock";

class TopAlbumsCommand extends Command {
  constructor() {
    super({
      name: "topalbums",
      description: "Displays user's top-played albums of an artist.",
      usage: ["topalbums", "topalbums <artist name>"],
      aliases: ["ta", "tpa"],
      examples: ["topalbums Devin Townsend"],
      require_login: true,
      category: "userstat",
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
    const user = await db.fetch_user(message.guild?.id, message.author.id);
    if (!user) return;

    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    let artist_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(client, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
    } else {
      artist_name = args.join(" ");
    }
    const { status, data } = await new LastFM().query({
      method: "artist.getinfo",
      params: {
        artist: artist_name,
        username: user.username,
        autocorrect: 1,
      },
    });
    if (status !== 200 || data.error) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    const artist: ArtistInterface = data.artist;
    if (
      !artist.stats.userplaycount ||
      parseInt(artist.stats.userplaycount) <= 0
    ) {
      response.text = `You haven't listened to ${cb(artist.name)}`;
      await response.send();
      return;
    }
    const albums = await lastfm_user.get_albums(artist.name);
    if (!albums) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    if (!albums.length) {
      response.text = "Couldn't find any album that you *may* have scrobbled.";
      await response.send();
      return;
    }
    const total_scrobbles = albums.reduce((a, b) => a + b.plays, 0);

    const fields_embed = new FieldsEmbed()
      .setArray(albums)
      .setAuthorizedUsers([])
      .setChannel(<TextChannel>message.channel)
      .setElementsPerPage(15)
      .setPageIndicator(true, "hybrid")
      .setDisabledNavigationEmojis(["delete"])
      .formatField(`Album plays — ${albums.length} albums`, (el: any) => {
        const elem: {
          name: string;
          plays: number;
        } = el;
        const index = albums.findIndex((e) => e.name === elem.name) + 1;
        return `${index}. ${elem.name} — **${elem.plays} play(s)**`;
      });
    fields_embed.embed
      .setColor(message.member?.displayColor || "000000")
      .setTitle(
        `${message.author.username}'s top-played albums by ${cb(artist.name)}`
      )
      .setFooter(`Psst, try ${server_prefix}about to find the support server.`);
    fields_embed.on("start", () => {
      message.channel.stopTyping(true);
    });
    await fields_embed.build();
  }

  // Uses the Last.fm API instead of scraping their pages
  async run_alternate(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild?.id, message.author.id);
    if (!user) return;

    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    let artist_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(client, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
    } else {
      artist_name = args.join(" ");
    }
    const { status, data } = await new LastFM().query({
      method: "artist.getinfo",
      params: {
        artist: artist_name,
        username: user.username,
        autocorrect: 1,
      },
    });
    if (status !== 200 || data.error) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    const artist: ArtistInterface = data.artist;
    if (
      !artist.stats.userplaycount ||
      parseInt(artist.stats.userplaycount) <= 0
    ) {
      response.text = `You haven't listened to ${cb(artist.name)}`;
      await response.send();
      return;
    }

    let albums = await this.getLastfmAlbums(client, artist.name);
    if (!albums) return;
    const lastfm_requests: any = [];
    const breaking_album_names = ["null", "(null)", "undefined"];
    // Last.fm has some weird album names that cause server error in some of its APIs for whatever reason
    albums.forEach((album) => {
      if (album.name && !breaking_album_names.includes(album.name)) {
        lastfm_requests.push(
          new LastFM().get_albuminfo(album.name, artist.name, user.username)
        );
      }
    });
    interface Res {
      data: {
        error: number;
        message?: string;
        album: AlbumInterface;
      };
      status: number;
    }
    let responses: Res[] = [];
    await Promise.all(lastfm_requests).then((res: any) => (responses = res));
    responses = responses.filter((res) => res.data.error !== 6);
    if (!responses.length) {
      response.text = "No album found.";
      await response.send();
      return;
    }
    if (responses.some((response) => !response.data || !response.data.album)) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    const sorted_list = responses
      .filter(
        ({ data: { album } }, index, self) =>
          index ===
          self.findIndex(
            (t) => t.data.album.name.toLowerCase() === album.name.toLowerCase()
          )
      )
      .filter(({ data: { album } }) => parseInt(album.userplaycount) > 0)
      .map(({ data: { album } }) => {
        const { name, userplaycount } = album;
        return { name, userplaycount };
      })
      .sort((a, b) => parseInt(b.userplaycount) - parseInt(a.userplaycount));

    if (!sorted_list.length) {
      response.text = "Couldn't find any album that you *may* have scrobbled.";
      await response.send();
      return;
    }

    const fields_embed = new FieldsEmbed()
      .setArray(sorted_list)
      .setAuthorizedUsers([])
      .setChannel(<TextChannel>message.channel)
      .setElementsPerPage(15)
      .setPageIndicator(true)
      .setDisabledNavigationEmojis(["delete"])
      .formatField(`Album plays`, (el: any) => {
        const elem: AlbumInterface = el;
        const index = sorted_list.findIndex((e) => e.name === elem.name) + 1;
        return `${index}. ${elem.name} — **${elem.userplaycount} play(s)**`;
      });
    fields_embed.embed
      .setColor(message.member?.displayColor || "000000")
      .setTitle(
        `${message.author.username}'s top-played albums by ${cb(artist.name)}`
      )
      .setFooter(`Psst, try ${server_prefix}about to find the support server.`);
    fields_embed.on("start", () => {
      message.channel.stopTyping(true);
    });
    await fields_embed.build();
  }

  async getDeezerAlbums(
    client: CrownBot,
    artist_name: string
  ): Promise<DeezerAlbumInterface[] | undefined> {
    const { data } = await axios.get(
      `https://api.deezer.com/search/artist?limit=1&access_token=${client.access_token}&q=${artist_name}`
    );
    if (!data || !data.data || !data.data.length) return undefined; // ikr...
    const artist = data.data[0];
    let albums = (
      await axios.get(
        `https://api.deezer.com/artist/${artist.id}/albums?limit=50&access_token=${client.access_token}`
      )
    ).data;
    if (!albums || !albums.data) return undefined;
    return albums.data;
  }

  async getLastfmAlbums(
    client: CrownBot,
    artist_name: string
  ): Promise<TopAlbumInterface[] | undefined> {
    const { data } = await new LastFM().query({
      method: "artist.getTopAlbums",
      params: {
        artist: artist_name,
        autocorrect: 1,
      },
    });
    if (data.error || !data.topalbums?.album) return undefined;
    return data.topalbums.album;
  }
}

export default TopAlbumsCommand;
