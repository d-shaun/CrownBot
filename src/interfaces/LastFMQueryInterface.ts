import { ParsedUrlQueryInput } from "querystring";
import { AlbumMethods } from "../handlers/LastFM_components/Album";
import { ArtistMethods } from "../handlers/LastFM_components/Artist";
import { TrackMethods } from "../handlers/LastFM_components/Track";
import { UserMethods } from "../handlers/LastFM_components/User";
export type Period =
  | "overall"
  | "7day"
  | "1month"
  | "3month"
  | "6month"
  | "12month";

export type ValidMethods = {
  [K in keyof ArtistMethods]: ArtistMethods[K];
} & {
  [K in keyof TrackMethods]: TrackMethods[K];
} & {
  [K in keyof UserMethods]: UserMethods[K];
} & {
  [K in keyof AlbumMethods]: AlbumMethods[K];
};

export type GetMethod<T extends keyof ValidMethods> = ValidMethods[T];

export interface LastFMParams<K> {
  method: K;
  artist?: string;
  album?: string;
  track?: string;
  user?: string;
  limit?: number;
  period?: Period;
  autocorrect?: number;
}

export interface LastFMQuery
  extends LastFMParams<keyof ValidMethods>,
    ParsedUrlQueryInput {
  api_key: string;
  format: "json";
}
