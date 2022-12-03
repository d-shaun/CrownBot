export interface LeaderboardInterface {
  artist_name: string;
  track_name?: string;
  album_name?: string;
  discord_username: string;
  lastfm_username: string;
  userplaycount: string; // messed up earlier iteration on the database
  user_id: string;
  user_tag: string;
  guild_id: string | undefined;
  last_count?: string; // messed up earlier iteration on the database
  is_new?: boolean;
}

export interface NewLeaderboardInterface {
  artist_name: string;
  track_name?: string;
  album_name?: string;
  discord_username: string;
  lastfm_username: string;
  userplaycount: number;
  user_id: string;
  user_tag: string;
  guild_id: string | undefined;
  last_count?: number;
  is_new?: boolean;
}
