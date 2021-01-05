import { GuildMessage } from "../../classes/Command";
import { UserTopAlbum } from "../../interfaces/AlbumInterface";
import { UserTopArtist } from "../../interfaces/ArtistInterface";
import { Period } from "../../interfaces/LastFMQueryInterface";
import { UserinfoInterface } from "../../interfaces/LastFMUserinfoInterface";
import { UserRecentTrack, UserTopTrack } from "../../interfaces/TrackInterface";
import BotMessage from "../BotMessage";
import CrownBot from "../CrownBot";
import { LastFM } from "../LastFM";
import cheerio from "cheerio";
import cb from "../../misc/codeblock";
import Axios from "axios";

export default class extends LastFM {
  prefix = "user.";
  configs = {
    autocorrect: 1,
    limit: 10,
  };
  username: string;

  constructor({ username, limit }: { username: string; limit?: number }) {
    super();
    this.username = username;
    if (limit) this.configs.limit = limit;
  }

  async get_info() {
    const query = await this.query<UserinfoInterface>({
      method: this.prefix + "getInfo",
      user: this.username,
      ...this.configs,
    });
    if (query.success) {
      // only check the following conditions if query is a success.
      // it could be undefined otherwise.

      if (!query.data.user) query.success = false;
    }
    return query;
  }

  async get_recenttracks() {
    const query = await this.query<UserRecentTrack>({
      method: this.prefix + "getRecentTracks",
      user: this.username,
      ...this.configs,
    });
    if (query.success) {
      // only check the following conditions if query is a success.
      // it could be undefined otherwise.

      if (
        !query.data.recenttracks?.track ||
        !query.data.recenttracks?.track.length
      ) {
        query.success = false;
      }
    }
    return query;
  }

  async get_top_artists({ period }: { period: Period }) {
    const query = await this.query<UserTopArtist>({
      method: this.prefix + "getTopArtists",
      user: this.username,

      period,
      ...this.configs,
    });
    if (query.success) {
      // only check the following conditions if query is a success.
      // it could be undefined otherwise.

      if (
        !query.data.topartists?.artist ||
        !query.data.topartists?.artist.length
      ) {
        query.success = false;
      }
    }

    return query;
  }

  async get_top_tracks({ period }: { period: Period }) {
    const query = await this.query<UserTopTrack>({
      method: this.prefix + "getTopTracks",
      user: this.username,
      period,
      ...this.configs,
    });
    if (query.success) {
      // only check the following conditions if query is a success.
      // it could be undefined otherwise.

      if (!query.data.toptracks?.track || !query.data.toptracks?.track.length) {
        query.success = false;
      }
    }
    return query;
  }

  async get_top_albums({ period }: { period: Period }) {
    const query = await this.query<UserTopAlbum>({
      method: this.prefix + "getTopAlbums",
      user: this.username,
      period,
      ...this.configs,
    });
    if (query.success) {
      // only check the following conditions if query is a success.
      // it could be undefined otherwise.

      if (!query.data.topalbums?.album || !query.data.topalbums?.album.length) {
        query.success = false;
      }
    }
    return query;
  }

  //
  //This is here only to free bunch of commands of doing these checks.
  async get_nowplaying(client: CrownBot, message: GuildMessage) {
    const response = new BotMessage({
      client,
      message,
      reply: true,
    });
    const prev_limit = this.configs.limit;
    this.configs.limit = 1;
    const query = await this.get_recenttracks();
    this.configs.limit = prev_limit;
    if (query.lastfm_errorcode === 6) {
      response.error(
        "lastfm_error",
        `User ${cb(
          this.username
        )} doesn't exist on Last.fm; please try logging out and in again.`
      );
      return;
    }
    if (!query.success || query.lastfm_errorcode) {
      await response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }

    const last_track = [...query.data.recenttracks.track].shift();

    if (last_track && last_track[`@attr`] && last_track[`@attr`].nowplaying) {
      return last_track;
    } else {
      response.text = "You aren't playing anything.";
      await response.send();
      return;
    }
  }

  //
  //
  // JUST WERKS SECTION
  //
  // LEGACY: SCRAPING.
  // I don't want to remember how these parsers below work, but they work.
  // They're supposed to return either the requested data or undefined.
  // I have no plans of refactoring this to make it consistent with the LastFMResponse<T>.
  //

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
    try {
      const response = await Axios.get(URL, this.timeout).catch(() => {
        return undefined;
      });
      if (response?.status !== 200 || !response.data) {
        return undefined;
      }
      const stat = this.parse_chartpage(response.data);
      return stat;
    } catch (_) {
      return undefined;
    }
  }

  async get_tracks(artist_name: string) {
    const URL = `https://www.last.fm/user/${encodeURIComponent(
      this.username
    )}/library/music/${encodeURIComponent(artist_name)}/+tracks`;

    try {
      const response = await Axios.get(URL, this.timeout).catch(() => {
        return undefined;
      });
      if (response?.status !== 200 || !response.data) {
        return undefined;
      }
      const stat = this.parse_chartpage(response.data);
      return stat;
    } catch (_) {
      return undefined;
    }
  }

  async get_album_tracks(artist_name: string, album_name: string) {
    try {
      const response = await Axios.get(
        `https://www.last.fm/user/${encodeURIComponent(
          this.username
        )}/library/music/${encodeURIComponent(
          artist_name
        )}/${encodeURIComponent(album_name)}`,
        this.timeout
      );
      if (response?.status !== 200) {
        return undefined;
      }
      const stat = this.parse_chartpage(response.data);
      return stat;
    } catch (_) {
      return undefined;
    }
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
      this.timeout
    )
      .catch(() => {
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
    try {
      const response = await Axios.get(
        `https://www.last.fm/user/${encodeURIComponent(
          this.username
        )}/library${artist_specific}?date_preset=${date_preset}`,
        this.timeout
      ).catch(() => {
        return undefined;
      });

      if (response?.status !== 200) {
        return undefined;
      }
      const stat = this.parse_listening_history(response.data);
      return stat;
    } catch (_) {
      return undefined;
    }
  }

  //
  //
  // END OF JUST WERKS SECTION
  //
  //
}
