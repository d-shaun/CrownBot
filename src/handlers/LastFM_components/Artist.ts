import {
  ArtistInterface,
  UserArtistInterface,
} from "../../interfaces/ArtistInterface";
import { LastFMResponse } from "../../interfaces/LastFMResponseInterface";
import { LastFM } from "../LastFM";

export default class extends LastFM {
  prefix = "artist.";
  configs = {
    autocorrect: 1,
  };
  name?: string;
  username?: string;

  constructor({ name, username }: { name?: string; username?: string }) {
    super();
    this.name = name;
    this.username = username;
  }

  custom_check(
    response: LastFMResponse<{ artist: UserArtistInterface }>
  ): boolean {
    if (this.username && !response.data.artist.stats.userplaycount) {
      return false;
    }

    return true;
  }

  async get_info({ name }: { name?: string } = { name: undefined }) {
    let artist_name = this.name;
    if (name) artist_name = name;

    if (!artist_name) throw "No artist name specified.";

    return this.query<{ artist: ArtistInterface }>({
      method: this.prefix + "getInfo",
      artist: artist_name,
      user: this.username,
      ...this.configs,
    });
  }

  // with username
  async user_get_info({ name }: { name?: string } = { name: undefined }) {
    let artist_name = this.name;
    if (name) artist_name = name;

    if (!artist_name) throw "No artist name specified.";

    return this.query<{ artist: UserArtistInterface }>({
      method: this.prefix + "getInfo",
      artist: artist_name,
      user: this.username,
      ...this.configs,
    });
  }
}
