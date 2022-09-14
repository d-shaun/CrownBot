import { LastFMResponse } from "../../interfaces/LastFMResponseInterface";
import { SearchTrack, Track, UserTrack } from "../../interfaces/TrackInterface";
import { LastFM } from "../LastFM";

export default class extends LastFM {
  prefix = "track.";
  configs = {
    autocorrect: 1,
    limit: 10,
  };
  name: string;
  artist_name?: string;
  username?: string;

  constructor({
    name,
    artist_name,
    username,
    limit,
  }: {
    name: string;
    artist_name?: string;
    username?: string;
    limit?: number;
  }) {
    super();
    this.name = name;
    this.artist_name = artist_name;
    this.username = username;
    if (limit) this.configs.limit = limit;
  }

  custom_check(response: LastFMResponse<UserTrack>): boolean {
    if (this.username && response.data.track.userplaycount === undefined) {
      return false;
    }

    return true;
  }

  async get_info() {
    return this.query<Track>({
      method: this.prefix + "getInfo",
      track: this.name,
      artist: this.artist_name,
      user: this.username,
      ...this.configs,
    });
  }

  // with username
  async user_get_info() {
    return <LastFMResponse<UserTrack>>await this.get_info();
  }

  async search() {
    if (!this.name) throw "Track name is required to search.";
    return this.query<SearchTrack>({
      method: this.prefix + "search",
      track: this.name,
      user: this.username,
      ...this.configs,
    });
  }
}
