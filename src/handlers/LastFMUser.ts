import { Message } from "discord.js";
import { Template } from "../classes/Template";
import { RecentTrackInterface } from "../interfaces/TrackInterface";
import BotMessage from "./BotMessage";
import CrownBot from "./CrownBot";
import { LastFM } from "./LastFM";
import Axios from "axios";
import cheerio from "cheerio";
export default class LastFMUser {
  username: string;
  discord_id?: string;
  constructor({ username, discord_ID }: { [key: string]: string }) {
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

  async get_username(): Promise<string> {
    const request = await new LastFM().query({
      method: "track.search",
      params: {
        track: "someday",
      },
    });
    console.log(request);
    return "test";
  }

  async get_nowplaying(
    client: CrownBot,
    message: Message
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
    if (data.error) {
      if (data.error === 6) {
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
    const response = await Axios.get(
      `https://www.last.fm/user/${this.username}/library/music/${artist_name}/+albums`
    );
    if (response.status !== 200) {
      return undefined;
    }
    const stat = this.parse_chartpage(response.data);
    return stat;
  }

  async get_tracks(artist_name: string) {
    const response = await Axios.get(
      `https://www.last.fm/user/${this.username}/library/music/${artist_name}/+tracks`
    );
    if (response.status !== 200) {
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

  async get_stats(date_preset = "LAST_7_DAYS") {
    const scrobbles_page = await Axios.get(
      `https://www.last.fm/user/${this.username}/library?date_preset=${date_preset}`
    );
    const artists_page = await Axios.get(
      `https://www.last.fm/user/${this.username}/library/artists?date_preset=${date_preset}`
    );
    const albums_page = await Axios.get(
      `https://www.last.fm/user/${this.username}/library/albums?date_preset=${date_preset}`
    );
    const tracks_page = await Axios.get(
      `https://www.last.fm/user/${this.username}/library/tracks?date_preset=${date_preset}`
    );
    if (scrobbles_page.status !== 200) {
      return undefined;
    }
    const { scrobbles, average_per_day } = this.parse_library_scrobbles(
      scrobbles_page.data
    );

    const artists = this.find_library_scrobbles(artists_page.data);
    const albums = this.find_library_scrobbles(albums_page.data);
    const tracks = this.find_library_scrobbles(tracks_page.data);
    return { scrobbles, average_per_day, artists, albums, tracks };
  }
}
