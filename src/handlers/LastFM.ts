import axios from "axios";
import { ParsedUrlQueryInput, stringify } from "querystring";
import { SearchAlbumInterface } from "../interfaces/AlbumInterface";
import { SearchTrackInterface } from "../interfaces/TrackInterface";
interface ParamInterface extends ParsedUrlQueryInput {
  artist?: string;
  album?: string;
  track?: string;
  user?: string;
  limit?: number;
  autocorrect?: number;
}

const { API_KEY } = process.env;

export class LastFM {
  format = "json";
  #apikey = API_KEY;
  url = "https://ws.audioscrobbler.com/2.0/?";
  constructor() {
    if (!this.#apikey) {
      throw "API key is missing from the environment variable.";
    }
    return this;
  }

  async query({ method, params }: { method: string; params: ParamInterface }) {
    params.api_key = API_KEY;
    params.format = "json";
    params.method = method;
    const response = await axios
      .get(this.url + stringify(params))
      .then((res) => res)
      .catch(({ response }) => response);
    return response;
    // will refactor and code for each queries individually with proper type interfaces... someday.
  }

  async get_albuminfo(
    name: string,
    artist_name: string,
    username: string
  ): Promise<any> {
    const { status, data } = await this.query({
      method: "album.getinfo",
      params: {
        artist: artist_name,
        album: name,
        limit: 1,
        autocorrect: 1,
        username,
      },
    });
    return { status, data };
  }

  async search_album(name: string): Promise<SearchAlbumInterface> {
    const { status, data } = await this.query({
      method: "album.search",
      params: {
        album: name,
        limit: 1,
        autocorrect: 1,
      },
    });
    return { status, data };
  }

  async search_track(name: string): Promise<SearchTrackInterface> {
    const { status, data } = await this.query({
      method: "track.search",
      params: {
        track: name,
        limit: 1,
        autocorrect: 1,
      },
    });
    return { status, data };
  }
}
