interface AlbumComponent {
  artist: string;
  image: {
    "#text": string;
    size: string;
  }[];
  listeners: string;
  mbid: string;
  name: string;
  playcount: number;
  tags: { tag: { name: string; url: string }[] };
  tracks: {
    track: AlbumTrack[];
  };
  url: string;
}

export interface Album {
  album: AlbumComponent;
}

export interface UserAlbum {
  album: AlbumComponent & {
    userplaycount: number;
  };
}

interface AlbumTrack {
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

export interface SearchAlbum {
  results: {
    albummatches: {
      album: AlbumComponent[];
    };
  };
}

export interface UserTopAlbum {
  topalbums: {
    album: {
      name: string;
      playcount: number;
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
    }[];
  };
}
