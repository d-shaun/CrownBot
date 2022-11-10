import { Album, SearchAlbum, UserAlbum } from "../../interfaces/AlbumInterface";
import { LastFMResponse } from "../../interfaces/LastFMResponseInterface";
import { LastFM } from "../LastFM";

export default class extends LastFM {
  prefix = "album.";
  configs = {
    autocorrect: 1,
    limit: 10,
  };
  name?: string;
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

  custom_check(response: LastFMResponse<UserAlbum>): boolean {
    if (this.username && response.data.album?.userplaycount === undefined) {
      return false;
    }

    return true;
  }

  async get_info<T = Album>() {
    return this.query<T>({
      method: this.prefix + "getInfo",
      album: this.name,
      artist: this.artist_name,
      user: this.username,
      ...this.configs,
    });
  }

  // with username
  async user_get_info() {
    return await this.get_info<UserAlbum>();
  }

  async search() {
    if (!this.name) throw "Album name is required to search.";
    return this.query<SearchAlbum>({
      method: this.prefix + "search",
      album: this.name,
      user: this.username,
      ...this.configs,
    });
  }
}
