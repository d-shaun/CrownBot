interface AlbumTrackInterface {
  "@attr": { rank: string };
  artist: {
    name: string;
    mbid: string;
    url: string;
  };
  duration: string;
  name: string;
  streamable: {
    "#text": string;
    fulltrack: string;
  };
  url: string;
}

export interface AlbumInterface {
  artist: string;
  image: {
    "#text": string;
    size: string;
  }[];
  listeners: string;
  mbid: string;
  name: string;
  playcount: string;
  tags: { tag: { name: string; url: string }[] };
  tracks: {
    track: AlbumTrackInterface[];
  };
  url: string;
  userplaycount: string;
}

export interface SearchAlbumInterface {
  status: number;
  data: {
    error?: number;
    results: { albummatches: { album: AlbumInterface[] } };
  };
}

export interface TopAlbumInterface {
  name: string;
  playcount: string;
  mbid: string;
  url: string;
  artist: {
    name: string;
    url: string;
    mbid: string;
  };
  image: {
    "#text": string;
    size: string;
  }[];
}
