interface ArtistComponent {
  bio?: {
    content: string;
    links: { link: { "#text": string; href: string; rel: string } };
    published: string;
    summary: string;
  };
  image: {
    "#text": string;
    size: string;
  }[];
  mbid: string;
  name: string;
  ontour: string;
  similar: {
    artist: {
      name: string;
      url: string;
      image: {
        "#text": string;
        size: string;
      }[];
    }[];
  };
  stats: {
    listeners: string;
    playcount: number;
  };
  streamable: string;
  tags: { tag: { name: string; url: string }[] };
  url: string;
}

export interface Artist {
  artist: ArtistComponent;
}

export interface UserArtist {
  artist: ArtistComponent & {
    stats: {
      listeners: string;
      playcount: number;
      userplaycount: number;
    };
  };
}

export interface UserTopArtist {
  topartists: {
    artist: {
      "@attr": { rank: string };
      image: {
        "#text": string;
        size: string;
      }[];
      mbid: string;
      name: string;
      playcount: number;
      streamable: string;
      url: string;
      last_count?: number;
      is_new?: boolean;
    }[];
  };
}
