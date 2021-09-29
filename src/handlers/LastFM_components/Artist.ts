import axios from "axios";
import cheerio from "cheerio";
import { Artist, UserArtist } from "../../interfaces/ArtistInterface";
import { LastFMResponse } from "../../interfaces/LastFMResponseInterface";
import { LastFM } from "../LastFM";

export default class extends LastFM {
  prefix = "artist.";
  configs = {
    autocorrect: 1,
  };
  name: string;
  username?: string;

  constructor({ name, username }: { name: string; username?: string }) {
    super();
    this.name = name;
    this.username = username;
  }

  custom_check(response: LastFMResponse<UserArtist>): boolean {
    if (
      this.username &&
      response.data.artist.stats.userplaycount === undefined
    ) {
      return false;
    }

    return true;
  }

  async get_info() {
    return this.query<Artist>({
      method: this.prefix + "getInfo",
      artist: this.name,
      user: this.username,
      ...this.configs,
    });
  }

  // with username
  async user_get_info() {
    return <LastFMResponse<UserArtist>>await this.get_info();
  }

  // SCRAPING SECTION

  async parse_artistpage(data: string) {
    if (typeof data !== "string") return undefined;
    const $ = cheerio.load(data);
    const track_list = $(".chartlist").find(".chartlist-row");
    const stats: { name: string; listeners: number }[] = [];
    track_list.each(function (_: any, elem: any) {
      const name = $(elem).find(".chartlist-name").text().trim();
      const listeners = $(elem)
        .find(".chartlist-count-bar-value")
        .text()
        .trim()
        .replace(",", "");
      stats.push({
        name,
        listeners: parseInt(listeners),
      });
    });
    return stats;
  }

  async get_trending() {
    const URL = `https://www.last.fm/music/${encodeURIComponent(
      this.name
    )}/+tracks?date_preset=LAST_7_DAYS`; // TODO: Add support for other time-frames available on lfm
    try {
      const response = await axios.get(URL, this.timeout).catch(() => {
        return undefined;
      });
      if (response?.status !== 200 || !response.data) {
        return undefined;
      }
      const stat = this.parse_artistpage(response.data);
      return stat;
    } catch (_) {
      return undefined;
    }
  }

  // END OF SCRAPING SECTION
}
