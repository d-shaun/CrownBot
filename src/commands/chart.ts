import { AttachmentBuilder, Client, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import { createCanvas, loadImage, registerFont } from "canvas";
import { Spotify } from "../handlers/Spotify";
import { UserTopAlbum } from "../interfaces/AlbumInterface";
import { UserTopArtist } from "../interfaces/ArtistInterface";
import { Period } from "../interfaces/LastFMQueryInterface";
import { UserTopTrack } from "../interfaces/TrackInterface";

export interface Data {
  id?: number;
  name: string;
  artist_name?: string;
  album_name?: string;
  image_url?: string;
  playcount: number;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chart")
    .setDescription("Generates user's artist/album/track charts")
    .addStringOption((option) =>
      option
        .setName("chart_type")
        .setDescription("Chart type")
        .setRequired(true)
        .addChoices(
          {
            name: "Artist",
            value: "artist",
          },
          {
            name: "Tracks",
            value: "track",
          },
          {
            name: "Album",
            value: "album",
          }
        )
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Time-frame for the list")
        .setRequired(false)
        .addChoices(
          {
            name: "Weekly",
            value: "7day",
          },
          {
            name: "Monthly",
            value: "1month",
          },
          {
            name: "Yearly",
            value: "12month",
          },
          {
            name: "All-time",
            value: "overall",
          }
        )
    )
    .addIntegerOption((option) =>
      option
        .setName("columns")
        .setDescription("Number of columns for the grid (default: 5, max: 5)")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("rows")
        .setDescription("Number of rows for the grid (default: 5, max: 10)")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("hide_titles")
        .setDescription(
          "Hides titles and only shows grid of images if set true"
        )
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction
  ) {
    const response = new BotMessage({
      bot,
      interaction,
    });

    const db = new DB(bot.models);
    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (!user) return;
    const lastfm_user = new User({
      username: user.username,
    });
    const spotify = new Spotify();

    const chart_type = interaction.options.getString("chart_type", true);
    const time_frame = <Period>(
      (interaction.options.getString("time") || "7day")
    );

    let time_text = "weekly";

    switch (time_frame) {
      case "overall":
        time_text = "overall";
        break;
      case "7day":
        time_text = "weekly";
        break;
      case "1month":
        time_text = "monthly";
        break;
      case "12month":
        time_text = "yearly";
        break;
    }

    const columns = interaction.options.getInteger("columns") || 5;
    const rows = interaction.options.getInteger("rows") || 5;
    const hide_titles = interaction.options.getBoolean("hide_titles") || false;

    if (columns > 5 || rows > 10) {
      response.text = `The max grid size is \`5x10\`; you provided \`${columns}x${rows}\`.`;
    }

    lastfm_user.configs.limit = columns * rows;

    if (chart_type === "track" || chart_type === "artist") {
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

    if (chart_type === "album") {
      const query = await lastfm_user.get_top_albums({
        period: time_frame,
      });
      if (query.lastfm_errorcode || !query.success) {
        await response.error("lastfm_error", query.lastfm_errormessage);
        return;
      }
      const albums = query.data.topalbums.album;
      data = this.format_albums(albums);
    } else if (chart_type === "artist") {
      const query = await lastfm_user.get_top_artists({
        period: time_frame,
      });
      if (query.lastfm_errorcode || !query.success) {
        await response.error("lastfm_error", query.lastfm_errormessage);
        return;
      }
      const artists = query.data.topartists.artist;
      const temp_data = this.format_artists(artists);

      data = await spotify.attach_artist_images(temp_data);
    } else if (chart_type === "track") {
      const query = await lastfm_user.get_top_tracks({
        period: time_frame,
      });
      if (query.lastfm_errorcode || !query.success) {
        await response.error("lastfm_error", query.lastfm_errormessage);
        return;
      }
      const tracks = query.data.toptracks.track;
      const temp_data = this.format_tracks(tracks);
      data = await spotify.attach_track_images(<any>temp_data);
    }
    if (!data) return;

    /* generate chart */
    const config = {
      columns,
      rows,
      hide_titles,
    };
    const chart = await this.generate_chart(data, config);
    await interaction.editReply({
      content: `Here's your ${time_text} ${columns}x${rows} ${chart_type} chart.`,
      files: [chart],
    });
  },

  async generate_chart(
    data: Data[],
    config: { columns: number; rows: number; hide_titles: boolean }
  ) {
    const { columns: x, rows: y } = config;

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
    const canv = createCanvas(x * 100, y * 100);
    const ctx = canv.getContext(`2d`);
    ctx.font = font;
    let iter = 0;
    for (let yAxis = 0; yAxis < y * 100; yAxis += 100) {
      if (loaded_images[iter]) {
        for (let xAxis = 0; xAxis < x * 100; xAxis += 100) {
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
    if (config.hide_titles) {
      attachment = new AttachmentBuilder(canv.toBuffer(), {
        name: "chart.png",
      });
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
      const xAxis = x * 100 + 75 + max_name_length + max_playcount_length;
      const yAxis = y * 100 + 50;
      const finalCanvas = createCanvas(xAxis, yAxis);
      const fctx = finalCanvas.getContext(`2d`);
      fctx.fillStyle = `black`;
      fctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      fctx.drawImage(canv, 25, 25);
      fctx.font = font;
      let i = 0;
      let spacing = 0;
      for (let byChart = 25; byChart < 100 * y + 25; byChart += 100) {
        for (let inChart = 15; inChart <= 15 * x; inChart += 15) {
          const yAxis = byChart + inChart;
          const album = data_element[i];
          if (album) {
            fctx.fillStyle = `#858585`;
            fctx.fillText(album.playcount, x * 100 + 40, yAxis + spacing);

            fctx.fillStyle = `white`;
            fctx.fillText(
              album.text,
              x * 100 + 40 + max_playcount_length,
              yAxis + spacing
            );
          }
          i++;
          spacing += 2;
        }
        spacing = 0;
      }
      attachment = new AttachmentBuilder(finalCanvas.toBuffer(), {
        name: "chart.png",
      });
    }
    return attachment;
  },

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
  },

  format_artists(artists: UserTopArtist["topartists"]["artist"]): Data[] {
    return artists.map((artist) => {
      return {
        name: artist.name,
        playcount: parseInt(artist.playcount),
      };
    });
  },

  format_tracks(tracks: UserTopTrack["toptracks"]["track"]): Data[] {
    return tracks.map((track) => {
      return {
        artist_name: track.artist.name,
        album_name: track.name,
        name: track.name,
        playcount: parseInt(track.playcount),
      };
    });
  },
};
