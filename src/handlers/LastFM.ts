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
