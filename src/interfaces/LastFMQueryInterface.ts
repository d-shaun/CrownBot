import { ParsedUrlQueryInput } from "querystring";

export interface LastFMParams {
  method: string;
  artist?: string;
  album?: string;
  track?: string;
  user?: string;
  limit?: number;
  autocorrect?: number;
}

export interface LastFMQuery extends LastFMParams, ParsedUrlQueryInput {
  api_key: string;
  format: "json";
}
