import Axios, { AxiosResponse } from "axios";
import { stringify } from "querystring";
import { LastFMParams, LastFMQuery } from "../interfaces/LastFMQueryInterface";
import { LastFMResponse } from "../interfaces/LastFMResponseInterface";

const { API_KEY } = process.env;

export class LastFM {
  timeout = { timeout: 30 * 1000 };
  format = "json";
  #apikey = API_KEY;
  url = "https://ws.audioscrobbler.com/2.0/?";

  async query<T>(params: LastFMParams): Promise<LastFMResponse<T>> {
    if (!this.#apikey)
      throw "Last.fm API is not set in the environment variable.";

    const query: LastFMQuery = {
      api_key: this.#apikey,
      format: "json",
      ...params,
    };

    const response: AxiosResponse = await Axios.get(
      this.url + stringify(query),
      this.timeout
    )
      .then((res) => res)
      .catch((error) => error.response || error);

    const reply = {
      lastfm_errorcode: response.data?.error,
      lastfm_errormessage: response.data?.message,
      axios_status: response.status,
      data: response.data,
      success: false,
    };

    // check if it was a success
    if (reply.axios_status === 200 && !reply.lastfm_errorcode && reply.data) {
      reply.success = true;
      if (!this.custom_check(reply)) {
        reply.success = false;
      }
    }

    return reply;
  }

  custom_check(data: any): boolean {
    return !!data;
  }
}

// import axios from "axios";
// import { ParsedUrlQueryInput, stringify } from "querystring";
// import { SearchAlbumInterface } from "../interfaces/AlbumInterface";
// import { SearchTrackInterface } from "../interfaces/TrackInterface";
// interface ParamInterface extends ParsedUrlQueryInput {
//   artist?: string;
//   album?: string;
//   track?: string;
//   user?: string;
//   limit?: number;
//   autocorrect?: number;
// }

// export interface ResponseInterface {
//   data: undefined | any;
//   status?: any;
//   actual_response?: any;
// }

// const { API_KEY } = process.env;
// const timeout = { timeout: 30 * 1000 }; // 30 seconds timeout
// export class LastFM {
// format = "json";
// #apikey = API_KEY;
// url = "https://ws.audioscrobbler.com/2.0/?";
//   constructor() {
//     if (!this.#apikey) {
//       throw "API key is missing from the environment variable.";
//     }
//     return this;
//   }

// async query({
//   method,
//   params,
// }: {
//   method: string;
//   params: ParamInterface;
// }): Promise<ResponseInterface> {
//   params.api_key = API_KEY;
//   params.format = "json";
//   params.method = method;
//   let response = await axios
//     .get(this.url + stringify(params), timeout)
//     .then((res) => res)
//     .catch(({ response }) => response);
// if (typeof response !== "object" || !response) {
//   // workaround for empty Last.fm responses
//   response = {
//     status: undefined,
//     data: undefined,
//     actual_response: response,
//   };
// }
//   return response;
//   // will refactor and code for each queries individually with proper type interfaces... someday.
// }

//   async get_albuminfo(
//     name: string,
//     artist_name: string,
//     username: string
//   ): Promise<any> {
//     const { status, data } = await this.query({
//       method: "album.getinfo",
//       params: {
//         artist: artist_name,
//         album: name,
//         limit: 1,
//         autocorrect: 1,
//         username,
//       },
//     });
//     return { status, data };
//   }

//   async search_album(name: string): Promise<SearchAlbumInterface> {
//     const { status, data } = await this.query({
//       method: "album.search",
//       params: {
//         album: name,
//         limit: 1,
//         autocorrect: 1,
//       },
//     });
//     return { status, data };
//   }

//   async search_track(name: string): Promise<SearchTrackInterface> {
//     const { status, data } = await this.query({
//       method: "track.search",
//       params: {
//         track: name,
//         limit: 1,
//         autocorrect: 1,
//       },
//     });
//     return { status, data };
//   }
// }
