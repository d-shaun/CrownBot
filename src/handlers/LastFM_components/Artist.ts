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
}
