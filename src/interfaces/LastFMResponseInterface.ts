export interface LastFMResponse<Data> {
  lastfm_errorcode?: number;
  lastfm_errormessage?: string;
  axios_status: number;
  success: boolean;
  data: Data;
}
