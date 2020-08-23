import { createCanvas, loadImage, registerFont } from "canvas";
import { Message, MessageAttachment } from "discord.js";
import Command from "../classes/Command";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import LastFMUser from "../handlers/LastFMUser";
import { TopAlbumInterface } from "../interfaces/AlbumInterface";
import cb from "../misc/codeblock";
class ChartCommand extends Command {
  constructor() {
    super({
      name: "chart",
      description:
        "Generates user's weekly, monthly, or yearly top-albums chart. By default, `period` is 'weekly', `grid size` is '5x5', and `notitles` is turned off.",
      usage: ["chart [<period>] [<grid size>] [<nt/notitles>]"],
      examples: [
        "chart weekly",
        "chart monthly 4x4",
        "chart monthly notitles",
        "chart monthly 5x6 notitles",
      ],
      aliases: ["c"],
      require_login: true,
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const no_album_cover = "https://i.imgur.com/N5xps21.png";
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
    registerFont("./src/fonts/Roboto-Regular.ttf", { family: "Roboto" });
    const font = "15px Roboto";
    const no_title_aliases = ["notitle", "nt", "notitles"];
    let config = {
      period: {
        text: "weekly",
        value: <string | undefined>"7day",
      },
      limit: 0,
      no_title: false,
    };

    if (no_title_aliases.includes(args[0])) {
      config.no_title = true;
    } else {
      switch (args[0]) {
        case `a`:
        case `alltime`:
        case `o`:
        case `overall`:
          config.period.text = `all-time`;
          config.period.value = `overall`;
          break;
        case `w`:
        case `weekly`:
          config.period.text = `weekly`;
          config.period.value = `7day`;
          break;
        case `monthly`:
        case `m`:
          config.period.text = `monthly`;
          config.period.value = `1month`;
          break;
        case `yearly`:
        case `y`:
          config.period.text = `yearly`;
          config.period.value = `12month`;
          break;
        case undefined:
          config.period.text = `weekly`;
          config.period.value = `7day`;
          break;
        default:
          config.period.value = undefined;
      }
    }

    if (no_title_aliases.includes(args[1])) {
      config.no_title = true;
    }
    if (no_title_aliases.includes(args[2])) {
      config.no_title = true;
    }
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
    let size: { x: number; y: number } | undefined = { x: 5, y: 5 };
    if (args[1] && args[1].split("x").length === 2) {
      size = await parse_size(args[1]);
    } else if (args[2] && args[2].split("x").length === 2) {
      size = await parse_size(args[2]);
    }

    if (!size) return;
    config.limit = size.x * size.y;
    if (!config.period.value) {
      response.text = `Invalid time-period provided; see ${cb(
        "help chart",
        server_prefix
      )} for help.`;
      await response.send();
      return;
    }

    let query = await lastfm_user.get_top_albums({
      limit: config.limit,
      period: config.period.value,
    });
    if (!query.topalbums || !query.topalbums.album) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    const albums: TopAlbumInterface[] = query.topalbums.album;
    if (!albums.length) {
      response.text = "You haven't listened to any album in the time-period.";
      await response.send();
      return;
    }
    let cached_noalbumcover: any;
    const promises = albums.map((album) => {
      let album_cover;
      if (album.image) {
        const last_item = album.image[2];
        if (last_item) {
          album_cover = last_item["#text"];
        }
      }
      if (album_cover) {
        return loadImage(album_cover);
      } else {
        if (!cached_noalbumcover) {
          cached_noalbumcover = loadImage(no_album_cover);
        }
        return cached_noalbumcover;
      }
    });
    const loaded_images = await Promise.all(promises);

    const album_images = loaded_images.map((x) =>
      x ? x : cached_noalbumcover
    );

    // anything that follows is mostly taken from https://github.com/kometh0616/fmcord/blob/master/src/commands/chart.ts.
    const canv = createCanvas(size.x * 100, size.y * 100);
    const ctx = canv.getContext(`2d`);
    ctx.font = font;
    let iter = 0;
    for (let yAxis = 0; yAxis < size.y * 100; yAxis += 100) {
      if (album_images[iter]) {
        for (let xAxis = 0; xAxis < size.x * 100; xAxis += 100) {
          if (album_images[iter]) {
            ctx.drawImage(album_images[iter], xAxis, yAxis, 100, 100);
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
      const album_elements = albums.map((x) => {
        const text = `${truncate(x.artist.name, 20)} — ${truncate(x.name, 30)}`;
        const playcount = `${x.playcount} ${
          parseInt(x.playcount) > 1 ? "plays" : "play"
        } · `;
        return {
          text,
          length: ctx.measureText(text),
          playcount,
          playcount_length: ctx.measureText(playcount),
        };
      });
      const max_name_length = Math.max(
        ...album_elements.map((elem) => elem.length.width)
      );
      const max_playcount_length = Math.max(
        ...album_elements.map((elem) => elem.playcount_length.width)
      );
      const xAxis = size.x * 100 + 75 + max_name_length + max_playcount_length;
      const yAxis = size.y * 100 + 50;
      const finalCanvas = createCanvas(xAxis, yAxis);
      const fctx = finalCanvas.getContext(`2d`);
      fctx.fillStyle = `black`;
      fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      fctx.drawImage(canv, 25, 25);
      fctx.font = font;
      let i = 0;
      let spacing = 0;
      for (let byChart = 25; byChart < 100 * size.y + 25; byChart += 100) {
        for (let inChart = 15; inChart <= 15 * size.x; inChart += 15) {
          const yAxis = byChart + inChart;
          const album = album_elements[i];
          if (album) {
            fctx.fillStyle = `#858585`;
            fctx.fillText(album.playcount, size.x * 100 + 40, yAxis + spacing);

            fctx.fillStyle = `white`;
            fctx.fillText(
              album.text,
              size.x * 100 + 40 + max_playcount_length,
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

    message.reply(
      `here's your ${config.period.text} ${size.x}x${size.y} chart.`,
      attachment
    );
  }
}

export default ChartCommand;
