import Axios, { AxiosResponse } from "axios";
import { stringify } from "querystring";
import {
  GetMethod,
  LastFMParams,
  LastFMQuery,
  ValidMethods,
} from "../interfaces/LastFMQueryInterface";
import { LastFMResponse } from "../interfaces/LastFMResponseInterface";

const { API_KEY } = process.env;

// custom overrides for vague or unfitting Last.fm error messages
const error_overrides = [
  {
    code: "17",
    message:
      "Please disable the 'Hide recent listening' option on your Last.fm account for this function to work.\
\n(Last.fm -> Settings -> Privacy -> Recent listening -> uncheck Hide recent listening information)",
  },
];

export class LastFM {
  timeout = { timeout: 30 * 1000 };
  format = "json";
  #apikey = API_KEY;
  url = "https://ws.audioscrobbler.com/2.0/?";

  /**
   * Centralized method to make queries to the Last.fm API.
   * @param params
   */
  async query<K extends keyof ValidMethods>(
    params: LastFMParams<K>
  ): Promise<LastFMResponse<GetMethod<K>>> {
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

    const error_message = error_overrides.find(
      (e) => e.code == response.data?.error
    );
    const reply = {
      lastfm_errorcode: response.data?.error,
      lastfm_errormessage: error_message
        ? error_message.message
        : response.data?.message,
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

  /**
   * Placeholder method to be replaced by the LastFM components.
   * @param data
   */
  custom_check(data: any): boolean {
    return !!data;
  }
}
