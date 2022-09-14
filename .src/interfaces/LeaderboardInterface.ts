export interface LeaderboardInterface {
  artist_name: string;
  track_name?: string;
  album_name?: string;
  discord_username: string;
  lastfm_username: string;
  userplaycount: string;
  user_id: string;
  user_tag: string;
  guild_id: string | undefined;
  last_count?: string;
  is_new?: boolean;
}
