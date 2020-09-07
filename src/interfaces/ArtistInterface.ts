export interface ArtistInterface {
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
    playcount: string;
    userplaycount?: string;
  };
  streamable: string;
  tags: { tag: { name: string; url: string }[] };
  url: string;
}

export interface TopArtistInterface {
  "@attr": { rank: string };
  image: {
    "#text": string;
    size: string;
  }[];
  mbid: string;
  name: string;
  playcount: string;
  streamable: string;
  url: string;
  last_count?: string;
  is_new?: boolean;
}
