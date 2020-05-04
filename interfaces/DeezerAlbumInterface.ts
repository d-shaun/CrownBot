export interface DeezerAlbumInterface {
  cover: string;
  cover_big: string;
  cover_medium: string;
  cover_small: string;
  cover_xl: string;
  explicit_lyrics: boolean;
  fans: number;
  genre_id: number;
  id: number;
  link: string;
  record_type: "album" | "single";
  release_date: string;
  title: string;
  tracklist: string;
  type: "album";
}
