import Axios from "axios";
import cheerio from "cheerio";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import moment from "moment";
import GuildChatInteraction from "../../classes/GuildChatInteraction";
import { Template } from "../../classes/Template";
import { UserTopAlbum } from "../../interfaces/AlbumInterface";
import { UserTopArtist } from "../../interfaces/ArtistInterface";
import { Period } from "../../interfaces/LastFMQueryInterface";
import { LastFMResponse } from "../../interfaces/LastFMResponseInterface";
import { UserinfoInterface } from "../../interfaces/LastFMUserinfoInterface";
import { UserRecentTrack, UserTopTrack } from "../../interfaces/TrackInterface";
import cb from "../../misc/codeblock";
import parse_spotify from "../../misc/parse_spotify_presence";
import BotMessage from "../BotMessage";
import { CommandResponse } from "../CommandResponse";
import CrownBot from "../CrownBot";
import { LastFM } from "../LastFM";
import { SpotifyNowPlaying } from "../Spotify";

export type UserMethods = {
  "user.getInfo": UserinfoInterface;
  "user.getRecentTracks": UserRecentTrack;
  "user.getTopArtists": UserTopArtist;
  "user.getTopTracks": UserTopTrack;
  "user.getTopAlbums": UserTopAlbum;
};

export default class extends LastFM {
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

  /**
   * Checks if Last.fm User has at least one scrobble
   */
  private validate_user(length: number, query: LastFMResponse<any>) {
    if (length <= 0)
      query.lastfm_errormessage =
        "The user you are logged in as hasn't scrobbled anything; please check if you have misspelled your username.";
  }

  async get_info() {
    const query = await this.query({
      method: "user.getInfo",
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

  async get_recenttracks(custom?: Record<string, unknown>) {
    const custom_options = { ...(custom || {}) };
    const query = await this.query({
      method: "user.getRecentTracks",
      user: this.username,
      ...this.configs,
      ...custom_options,
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

      this.validate_user(query.data.recenttracks?.track.length, query);
    }
    return query;
  }

  async get_top_artists({ period }: { period: Period }) {
    const query = await this.query({
      method: "user.getTopArtists",
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
      this.validate_user(query.data.topartists?.artist.length, query);
    }

    return query;
  }

  async get_top_tracks({ period }: { period: Period }) {
    const query = await this.query({
      method: "user.getTopTracks",
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
      this.validate_user(query.data.toptracks?.track.length, query);
    }
    return query;
  }

  async get_top_albums({ period }: { period: Period }) {
    const query = await this.query({
      method: "user.getTopAlbums",
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
      this.validate_user(query.data.topalbums?.album.length, query);
    }
    return query;
  }

  // soon to be replacing the og

  async new_get_nowplaying(
    interaction: GuildChatInteraction,
    response: CommandResponse,
    priority = 1
  ): Promise<
    | CommandResponse
    | UserRecentTrack["recenttracks"]["track"][0]
    | SpotifyNowPlaying
  > {
    if (priority === 1) {
      const presence_np = parse_spotify(interaction.member);
      const { artist_name, album_name, track_name } = presence_np;
      if (artist_name && album_name && track_name) {
        const formatted_nowplaying = {
          is_spotify: true,
          album: { "#text": album_name },
          artist: { "#text": artist_name },
          name: track_name,
        };
        return formatted_nowplaying;
      }
    }

    const prev_limit = this.configs.limit;
    this.configs.limit = 1;
    const query = await this.get_recenttracks();
    this.configs.limit = prev_limit;
    if (query.lastfm_errorcode === 6) {
      response.error_code = "lastfm_error";
      response.error_message = `User ${cb(
        this.username
      )} doesn't exist on Last.fm; please try logging out and in again.`;

      return response;
    }

    if (!query.success || query.lastfm_errorcode) {
      return response.error("lastfm_error", query.lastfm_errormessage);
    }

    const last_track = [...query.data.recenttracks.track].shift();
    if (last_track) {
      const has_now_playing_tag =
        last_track[`@attr`] && last_track[`@attr`].nowplaying;

      // consider the track scrobbled in the last 3 minutes as 'now-playing'
      let is_scrobbled_recently = false;
      if (last_track.date) {
        const diff = moment().diff(
          moment.unix(parseInt(last_track.date.uts)),
          "minutes"
        );
        is_scrobbled_recently = diff <= 3;
      }

      if (has_now_playing_tag || is_scrobbled_recently) return last_track;
    }
    return response.error("not_playing");
  }

  /**
   *
   * @param bot
   * @param interaction
   * @param priority Priority for nowplaying.
   *
   * 0 = return both in an array
   *
   * 1 = enable Spotify
   *
   * 2 = disable Spotify
   * @returns
   */
  async get_nowplaying(
    bot: CrownBot,
    interaction: GuildChatInteraction,
    priority = 1
  ): Promise<
    SpotifyNowPlaying | UserRecentTrack["recenttracks"]["track"][0] | undefined
  > {
    const response = new BotMessage({
      bot,
      interaction,
    });

    if (priority === 1) {
      const presence_np = parse_spotify(interaction.member);
      const { artist_name, album_name, track_name } = presence_np;
      if (artist_name && album_name && track_name) {
        const formatted_nowplaying = {
          is_spotify: true,
          album: { "#text": album_name },
          artist: { "#text": artist_name },
          name: track_name,
        };
        return formatted_nowplaying;
      }
    }

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
    if (last_track) {
      const has_now_playing_tag =
        last_track[`@attr`] && last_track[`@attr`].nowplaying;

      // consider the track scrobbled in the last 3 minutes as 'now-playing'
      let is_scrobbled_recently = false;
      if (last_track.date) {
        const diff = moment().diff(
          moment.unix(parseInt(last_track.date.uts)),
          "minutes"
        );
        is_scrobbled_recently = diff <= 3;
      }

      if (has_now_playing_tag || is_scrobbled_recently) return last_track;
    }
    const row = <ActionRowBuilder<ButtonBuilder>>(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Need help?")
          .setStyle(ButtonStyle.Secondary)
          .setCustomId("scrobblingfaq")
      )
    );

    const embed = new EmbedBuilder().setDescription(
      new Template().get("not_playing")
    );

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
    return;
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
    if (typeof data !== "string") return undefined;
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
    if (typeof data !== "string") return undefined;
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
    if (typeof data !== "string") return undefined;
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
    if (typeof data !== "string") return undefined;
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

  async get_alltime_listening_history() {
    try {
      const response = await Axios.get(
        `https://www.last.fm/user/${encodeURIComponent(this.username)}/library`,
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

  // doesn't work anymore
  async get_listening_history(
    date_preset?: string,
    artist_name?: string,
    from?: string
  ) {
    let artist_specific = "";
    let url_param = `date_preset=${date_preset || "LAST_7_DAYS"}`;
    if (from) {
      // listening history of an specified year
      url_param = `from=${from}-01-01&rangetype=year`;
    }
    if (artist_name) {
      artist_specific = "/music/" + encodeURIComponent(artist_name);
    }
    try {
      const response = await Axios.get(
        `https://www.last.fm/user/${encodeURIComponent(
          this.username
        )}/library${artist_specific}?${url_param}`,
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
