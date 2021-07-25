import { createCanvas, loadImage, registerFont } from "canvas";
import { Client, MessageAttachment } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import User from "../../handlers/LastFM_components/User";
import { Spotify } from "../../handlers/Spotify";
import { UserTopAlbum } from "../../interfaces/AlbumInterface";
import { UserTopArtist } from "../../interfaces/ArtistInterface";
import { Period } from "../../interfaces/LastFMQueryInterface";
import { UserTopTrack } from "../../interfaces/TrackInterface";
import cb from "../../misc/codeblock";

export interface Data {
  id?: number;
  name: string;
  artist_name?: string;
  album_name?: string;
  image_url?: string;
  playcount: number;
}

interface Config {
  period: {
    text: string;
    value: Period;
  };
  limit: number;
  no_title: boolean;
  size: { x: number; y: number };
  type: "artist" | "album" | "track";
}

class ChartCommand extends Command {
  constructor() {
    super({
      name: "chart",
      description:
        "Generates user's weekly, monthly, or yearly top-albums chart. By default, `period` is 'weekly', `grid size` is '5x5', and `notitles` is turned off.",
      usage: [
        "chart [<artist/track/album>] [<weekly/monthly/yearly/alltime>] [<grid size>] [<nt/notitles>]",
      ],
      examples: [
        "chart artist weekly",
        "chart track monthly 4x4",
        "chart album monthly notitles",
        "chart monthly 5x6 notitles",
      ],
      aliases: ["c"],
      require_login: true,
      category: "userstat",
    });
  }

  async run(
    client: Client,
    bot: CrownBot,
    message: GuildMessage,
    args: string[]
  ) {
    const server_prefix = bot.cache.prefix.get(message.guild);
    const response = new BotMessage({
      bot,
      message,
      reply: true,
    });
    const db = new DB(bot.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;
    const lastfm_user = new User({
      username: user.username,
    });

    const spotify = new Spotify();

    const no_title_aliases = ["notitle", "nt", "notitles"];
    const config: Config = {
      period: {
        text: "weekly",
        value: "7day",
      },
      limit: 0,
      no_title: false,
      size: { x: 5, y: 5 },
      type: "album",
    };

    const parse_size = async function (arg: string) {
      const numbers = arg.split("x");
      const x = parseInt(numbers[0]);
      const y = parseInt(numbers[1]);
      if (!(x && y)) {
        response.text = `Invalid grid size provided; see ${cb(
          "help chart",
          server_prefix
        )} for help.`;
        await response.send();
        return undefined;
      }
      if (x > 5 || y > 10) {
        response.text = `The max grid size is \`5x10\`; you provided \`${x}x${y}\`. See ${cb(
          "help chart",
          server_prefix
        )} for help.`;
        await response.send();
        return undefined;
      }
      return { x, y };
    };

    for await (const arg of args) {
      if (no_title_aliases.includes(arg)) {
        config.no_title = true;
      }

      if (arg.split("x").length === 2) {
        const size = await parse_size(arg);
        if (!size) return;
        config.size.x = size.x;
        config.size.y = size.y;
      }

      switch (arg) {
        case "artists":
        case "artist":
        case "ar":
        case "art":
          config.type = "artist";
          break;

        case "tracks":
        case "track":
        case "t":
          config.type = "track";
          break;
      }

      switch (arg) {
        case "a":
        case "alltime":
        case "o":
        case "overall":
          config.period.text = "all-time";
          config.period.value = "overall";
          break;
        case "w":
        case "weekly":
          config.period.text = "weekly";
          config.period.value = "7day";
          break;
        case "monthly":
        case "m":
          config.period.text = "monthly";
          config.period.value = "1month";
          break;
        case "yearly":
        case "y":
          config.period.text = "yearly";
          config.period.value = "12month";
          break;
      }
    }
    config.limit = config.size.x * config.size.y;
    lastfm_user.configs.limit = config.limit;

    if (config.type === "track" || config.type === "artist") {
      try {
        await spotify.attach_access_token();
      } catch (e) {
        response.text =
          "Something went wrong while authenticating the Spotify API; the API is required to show the artists' images.";
        await response.send();
        return;
      }
    }

    let data: Data[] | undefined;

    if (config.type === "album") {
      const query = await lastfm_user.get_top_albums({
        period: config.period.value,
      });
      if (query.lastfm_errorcode || !query.success) {
        response.error("lastfm_error", query.lastfm_errormessage);
        return;
      }
      const albums = query.data.topalbums.album;
      data = this.format_albums(albums);
    } else if (config.type === "artist") {
      const query = await lastfm_user.get_top_artists({
        period: config.period.value,
      });
      if (query.lastfm_errorcode || !query.success) {
        response.error("lastfm_error", query.lastfm_errormessage);
        return;
      }
      const artists = query.data.topartists.artist;
      const temp_data = this.format_artists(artists);

      data = await spotify.attach_artist_images(temp_data);
    } else if (config.type === "track") {
      const query = await lastfm_user.get_top_tracks({
        period: config.period.value,
      });
      if (query.lastfm_errorcode || !query.success) {
        response.error("lastfm_error", query.lastfm_errormessage);
        return;
      }
      const tracks = query.data.toptracks.track;
      const temp_data = this.format_tracks(tracks);
      data = await spotify.attach_track_images(<any>temp_data);
    }
    if (!data) return;

    /* generate chart */
    const chart = await this.generate_chart(data, config);
    await message.reply({
      content: `here's your ${config.period.text} ${config.size.x}x${config.size.y} ${config.type} chart.`,
      files: [chart],
    });
  }

  async generate_chart(data: Data[], config: Config) {
    const no_album_cover = "https://i.imgur.com/N5xps21.png";
    registerFont("./src/fonts/Roboto-Regular.ttf", { family: "Roboto" });
    const font = "15px Roboto";

    let cached_noalbumcover: any;
    try {
      cached_noalbumcover = await loadImage(no_album_cover);
    } catch {
      cached_noalbumcover = "";
    }

    const promises = data.map(async (elem) => {
      if (elem.image_url) {
        try {
          return await loadImage(elem.image_url);
        } catch (_) {
          return cached_noalbumcover;
        }
      } else {
        return cached_noalbumcover;
      }
    });

    const loaded_images = (await Promise.all(promises)).map((x) =>
      x ? x : cached_noalbumcover
    );

    // anything that follows is mostly taken from https://github.com/kometh0616/fmcord/blob/master/src/commands/chart.ts.
    const canv = createCanvas(config.size.x * 100, config.size.y * 100);
    const ctx = canv.getContext(`2d`);
    ctx.font = font;
    let iter = 0;
    for (let yAxis = 0; yAxis < config.size.y * 100; yAxis += 100) {
      if (loaded_images[iter]) {
        for (let xAxis = 0; xAxis < config.size.x * 100; xAxis += 100) {
          if (loaded_images[iter]) {
            ctx.drawImage(loaded_images[iter], xAxis, yAxis, 100, 100);
            iter++;
          } else break;
        }
      } else break;
    }

    let attachment;
    // https://stackoverflow.com/questions/1199352
    const truncate = function (str: string, n: number) {
      return str.length > n ? str.substr(0, n - 1) + "..." : str;
    };
    if (config.no_title) {
      attachment = new MessageAttachment(canv.toBuffer(), "chart.png");
    } else {
      const data_element = data.map((x) => {
        const text = `${
          x.artist_name ? truncate(x.artist_name, 20) + " — " : ""
        }${truncate(x.name, 30)}`;
        const playcount = `${x.playcount} ${
          x.playcount > 1 ? "plays" : "play"
        } · `;
        return {
          text,
          length: ctx.measureText(text),
          playcount,
          playcount_length: ctx.measureText(playcount),
        };
      });
      const max_name_length = Math.max(
        ...data_element.map((elem) => elem.length.width)
      );
      const max_playcount_length = Math.max(
        ...data_element.map((elem) => elem.playcount_length.width)
      );
      const xAxis =
        config.size.x * 100 + 75 + max_name_length + max_playcount_length;
      const yAxis = config.size.y * 100 + 50;
      const finalCanvas = createCanvas(xAxis, yAxis);
      const fctx = finalCanvas.getContext(`2d`);
      fctx.fillStyle = `black`;
      fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      fctx.drawImage(canv, 25, 25);
      fctx.font = font;
      let i = 0;
      let spacing = 0;
      for (
        let byChart = 25;
        byChart < 100 * config.size.y + 25;
        byChart += 100
      ) {
        for (let inChart = 15; inChart <= 15 * config.size.x; inChart += 15) {
          const yAxis = byChart + inChart;
          const album = data_element[i];
          if (album) {
            fctx.fillStyle = `#858585`;
            fctx.fillText(
              album.playcount,
              config.size.x * 100 + 40,
              yAxis + spacing
            );

            fctx.fillStyle = `white`;
            fctx.fillText(
              album.text,
              config.size.x * 100 + 40 + max_playcount_length,
              yAxis + spacing
            );
          }
          i++;
          spacing += 2;
        }
        spacing = 0;
      }
      attachment = new MessageAttachment(finalCanvas.toBuffer(), "chart.png");
    }
    return attachment;
  }

  format_albums(albums: UserTopAlbum["topalbums"]["album"]): Data[] {
    return albums.map((album) => {
      let image;
      if (album.image?.length) {
        image = [...album.image].pop()?.["#text"];
      }

      return {
        name: album.name,
        artist_name: album.artist.name,
        image_url: image,
        playcount: parseInt(album.playcount),
      };
    });
  }

  format_artists(artists: UserTopArtist["topartists"]["artist"]): Data[] {
    return artists.map((artist) => {
      return {
        name: artist.name,
        playcount: parseInt(artist.playcount),
      };
    });
  }

  format_tracks(tracks: UserTopTrack["toptracks"]["track"]): Data[] {
    return tracks.map((track) => {
      return {
        artist_name: track.artist.name,
        album_name: track.name,
        name: track.name,
        playcount: parseInt(track.playcount),
      };
    });
  }
}

export default ChartCommand;
