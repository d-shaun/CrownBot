import axios from "axios";
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
import { ArtistInterface } from "../interfaces/ArtistInterface";
import { DeezerAlbumInterface } from "../interfaces/DeezerAlbumInterface";

class TopAlbumsCommand extends Command {
  constructor() {
    super({
      name: "topalbums",
      description: "Displays user's top-played albums of an artist.",
      usage: ["topalbums", "topalbums <artist name>"],
      aliases: ["ta", "tp", "tpa"],
      examples: ["topalbums Devin Townsend"],
      require_login: true,
    });
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

  async run(client: CrownBot, message: Message, args: String[]) {
    const server_prefix = client.get_cached_prefix(message);
    const reply = new BotMessage({
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
        auto_correct: 1,
      },
    });
    if (status !== 200 || data.error) {
      reply.text = new Template(client, message).get("lastfm_error");
      await reply.send();
      return;
    }
    const artist: ArtistInterface = data.artist;
    if (
      !artist.stats.userplaycount ||
      parseInt(artist.stats.userplaycount) <= 0
    ) {
      reply.text = `You haven't listened to \`${artist.name}\``;
      await reply.send();
      return;
    }

    let albums = await this.getDeezerAlbums(client, artist.name);
    if (!albums) return;
    const lastfm_requests: any = [];
    albums.forEach((album) => {
      lastfm_requests.push(
        new LastFM().get_albuminfo(album.title, artist.name, user.username)
      );
    });
    interface res {
      data: {
        error: number;
        message?: string;
        album: AlbumInterface;
      };
      status: number;
    }
    var responses: res[] = [];
    await Promise.all(lastfm_requests).then((res: any) => (responses = res));
    responses = responses.filter((res) => res.data.error !== 6);
    if (!responses.length) {
      reply.text = "No album found.";
      await reply.send();
      return;
    }
    if (responses.some((response) => !response.data || !response.data.album)) {
      reply.text = new Template(client, message).get("lastfm_error");
      await reply.send();
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
      reply.text = "Couldn't find any album that you *may* have scrobbled.";
      await reply.send();
      return;
    }

    const fields_embed = new FieldsEmbed()
      .setArray(sorted_list)
      .setAuthorizedUsers([])
      .setChannel(<TextChannel>message.channel)
      .setElementsPerPage(15)
      .setPageIndicator(true)
      .setDisabledNavigationEmojis(["DELETE"])
      .formatField(`Album plays`, (el: any) => {
        const elem: AlbumInterface = el;
        const index = sorted_list.findIndex((e) => e.name == elem.name) + 1;
        return `${index}. ${elem.name} — **${elem.userplaycount} play(s)**`;
      });
    fields_embed.embed
      .setColor(message.member?.displayColor || "000000")
      .setTitle(
        `${message.author.username}'s top-played albums by \`${artist.name}\``
      )
      .setFooter(`Psst, try ${server_prefix}about to find the support server.`);
    await fields_embed.build();
  }
}

export default TopAlbumsCommand;
