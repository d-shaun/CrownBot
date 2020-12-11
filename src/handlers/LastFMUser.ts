import Axios, { AxiosResponse } from "axios";
import cheerio from "cheerio";
import { Message } from "discord.js";
import { GuildMessage } from "../classes/Command";
import { Template } from "../classes/Template";
import { RecentTrackInterface } from "../interfaces/TrackInterface";
import { UserinfoInterface } from "../interfaces/UserinfoInterface";
import BotMessage from "./BotMessage";
import CrownBot from "./CrownBot";
import { LastFM } from "./LastFM";
const timeout = { timeout: 30 * 1000 }; // 30 seconds timeout
export default class LastFMUser {
  username: string;
  discord_id?: string | number;
  constructor({
    username,
    discord_ID,
  }: {
    username: string;
    discord_ID: string | number;
  }) {
    if (!username && !discord_ID) {
      throw "Failed to initialize new LastFMUser without username and Discord ID.";
    }
    this.username = username;
    this.discord_id = discord_ID;

    return this;
  }

  set_username(username: string) {
    this.username = username;
  }
  async get_info(): Promise<{ user: UserinfoInterface } | undefined> {
    const { data } = await new LastFM().query({
      method: "user.getinfo",
      params: {
        user: this.username,
        limit: 1,
      },
    });
    if (data.error) {
      return undefined;
    } else {
      return data;
    }
  }
  async get_nowplaying(
    client: CrownBot,
    message: GuildMessage
  ): Promise<RecentTrackInterface | undefined> {
    const { data } = await new LastFM().query({
      method: "user.getrecenttracks",
      params: {
        user: this.username,
        limit: 1,
      },
    });
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    if (!data || data.error) {
      if (data?.error === 6) {
        response.text =
          "User ``" +
          this.username +
          "`` doesn't exist on Last.fm; please try logging out and in again.";
      } else {
        response.text = new Template(client, message).get("lastfm_error");
      }
      await response.send();
      return undefined;
    }
    const last_track = data.recenttracks.track[0];
    if (last_track && last_track[`@attr`] && last_track[`@attr`].nowplaying) {
      return last_track;
    } else {
      response.text = "You aren't playing anything.";
      await response.send();
      return undefined;
    }
  }

  async get_top_artists(config: { limit: number; period: string }) {
    const { data } = await new LastFM().query({
      method: "user.getTopArtists",
      params: {
        user: this.username,
        period: config.period,
        limit: config.limit,
      },
    });
    return data;
  }
  async get_top_tracks(config: { limit: number; period: string }) {
    const { data } = await new LastFM().query({
      method: "user.getTopTracks",
      params: {
        user: this.username,
        period: config.period,
        limit: config.limit,
      },
    });
    return data;
  }

  async get_top_albums(config: { limit: number; period: string }) {
    const { data } = await new LastFM().query({
      method: "user.getTopAlbums",
      params: {
        user: this.username,
        period: config.period,
        limit: config.limit,
      },
    });
    return data;
  }

  parse_chartpage(data: string) {
    const $ = cheerio.load(data);
    const chart_list = $(".chartlist").find(".chartlist-row");
    const stats: { name: string; plays: number }[] = [];
    chart_list.each(function (_: any, elem: any) {
      const name = $(elem).find(".chartlist-name").text().trim();
      $(elem).find(".stat-name").remove();
      const plays = $(elem)
        .find(".chartlist-count-bar-value")
        .text()
        .trim()
        .replace(",", "");
      stats.push({
        name,
        plays: parseInt(plays),
      });
    });
    return stats;
  }

  async get_albums(artist_name: string) {
    const URL = `https://www.last.fm/user/${encodeURIComponent(
      this.username
    )}/library/music/${encodeURIComponent(artist_name)}/+albums`;
    const response = await Axios.get(URL, timeout).catch((_) => {
      return undefined;
    });
    if (response?.status !== 200 || !response.data) {
      return undefined;
    }
    const stat = this.parse_chartpage(response.data);
    return stat;
  }

  async get_tracks(artist_name: string) {
    const URL = `https://www.last.fm/user/${encodeURIComponent(
      this.username
    )}/library/music/${encodeURIComponent(artist_name)}/+tracks`;

    const response = await Axios.get(URL, timeout).catch((_) => {
      return undefined;
    });
    if (response?.status !== 200 || !response.data) {
      return undefined;
    }
    const stat = this.parse_chartpage(response.data);
    return stat;
  }

  async get_album_tracks(artist_name: string, album_name: string) {
    const response = await Axios.get(
      `https://www.last.fm/user/${encodeURIComponent(
        this.username
      )}/library/music/${encodeURIComponent(artist_name)}/${encodeURIComponent(
        album_name
      )}`,
      timeout
    ).catch((_) => {
      return undefined;
    });
    if (response?.status !== 200) {
      return undefined;
    }
    const stat = this.parse_chartpage(response.data);
    return stat;
  }

  parse_library_scrobbles(data: string) {
    const $ = cheerio.load(data);
    const items = $(".page-content")
      .find("ul.metadata-list")
      .find("li.metadata-item");

    const scrobbles = parseInt(
      $(items[0]).find("p").text().trim().replace(",", "")
    );
    const average_per_day = parseInt(
      $(items[1]).find("p").text().trim().replace(",", "")
    );
    return { scrobbles, average_per_day };
  }

  find_library_scrobbles(data: string) {
    const $ = cheerio.load(data);
    return parseInt(
      $(".page-content")
        .find("ul.metadata-list")
        .find("li.metadata-item")
        .find("p")
        .text()
        .trim()
        .replace(",", "")
    );
  }

  generate_promise(date_preset: string, type?: string) {
    return Axios.get(
      `https://www.last.fm/user/${encodeURIComponent(this.username)}/library${
        type ? "/" + type : ""
      }?date_preset=${date_preset}`,
      timeout
    )
      .catch((_) => {
        return undefined;
      })
      .then((response) => {
        return {
          type: type ? type : "scrobbles",
          response,
        };
      });
  }

  async get_stats(date_preset = "LAST_7_DAYS") {
    const promises = [
      this.generate_promise(date_preset),
      this.generate_promise(date_preset, "artists"),
      this.generate_promise(date_preset, "albums"),
      this.generate_promise(date_preset, "tracks"),
    ];

    // let responses: { response: AxiosResponse; type: string }[] = [];

    return Promise.all(promises).then((responses) => {
      let artists: number | undefined,
        albums: number | undefined,
        tracks: number | undefined,
        scrobbles_page;
      for (const item of responses) {
        switch (item.type) {
          case "scrobbles":
            scrobbles_page = this.parse_library_scrobbles(item.response?.data);
            break;
          case "artists":
            artists = this.find_library_scrobbles(item.response?.data);
            break;
          case "albums":
            albums = this.find_library_scrobbles(item.response?.data);
            break;
          case "tracks":
            tracks = this.find_library_scrobbles(item.response?.data);
        }
      }

      if (!(scrobbles_page && artists && albums && tracks)) {
        return undefined;
      }

      const { scrobbles, average_per_day } = scrobbles_page;

      return {
        date_preset,
        scrobbles,
        average_per_day,
        artists,
        albums,
        tracks,
      };
    });
  }

  parse_listening_history(data: string) {
    const $ = cheerio.load(data);
    const data_points = $(".scrobble-table")
      .find(".table")
      .find("tbody")
      .find("tr");
    const stats: { date: string; playcount: number }[] = [];

    data_points.each(function (_, elem: any) {
      const date = $(elem).find(".js-period").text().trim();
      const playcount = $(elem)
        .find(".js-scrobbles")
        .text()
        .trim()
        .replace(",", "");
      stats.push({
        date,
        playcount: parseInt(playcount),
      });
    });
    return stats;
  }

  async get_listening_history(
    date_preset = "LAST_7_DAYS",
    artist_name?: string
  ) {
    let artist_specific = "";
    if (artist_name) {
      artist_specific = "/music/" + encodeURIComponent(artist_name);
    }
    const response = await Axios.get(
      `https://www.last.fm/user/${encodeURIComponent(
        this.username
      )}/library${artist_specific}?date_preset=${date_preset}`,
      timeout
    ).catch((_) => {
      return undefined;
    });

    if (response?.status !== 200) {
      return undefined;
    }
    const stat = this.parse_listening_history(response.data);
    return stat;
  }
}
