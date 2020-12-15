import { ParsedUrlQueryInput } from "querystring";
export type Period =
  | "overall"
  | "7day"
  | "1month"
  | "3month"
  | "6month"
  | "12month";

export interface LastFMParams {
  method: string;
  artist?: string;
  album?: string;
  track?: string;
  user?: string;
  limit?: number;
  period?: Period;
  autocorrect?: number;
}

export interface LastFMQuery extends LastFMParams, ParsedUrlQueryInput {
  api_key: string;
  format: "json";
}
