interface TrackComponent {
  album: {
    artist: string;
    image: {
      size: string;
      "#text": string;
    }[];
    title: string;
    url: string;
  };
  artist: {
    name: string;
    mbid: string;
    url: string;
  };
  duration: string;
  listeners: string;
  name: string;
  playcount: string;
  url: string;
}

export interface Track {
  track: TrackComponent;
}

export interface UserTrack {
  track: TrackComponent & {
    userloved: string;
    userplaycount: string;
  };
}

export interface UserRecentTrack {
  recenttracks: {
    track: {
      id?: number;
      "@attr"?: {
        nowplaying: boolean;
      };
      album: {
        "#text": string;
        mbid: string;
      };
      artist: {
        "#text": string;
        mbid: string;
      };
      image: {
        size: string;
        "#text": string;
      }[];
      mbid: string;
      name: string;
      streamable: string;
      url: string;
      date: {
        uts: string;
        "#text": string;
      };
    }[];
  };
}

export interface ShortenedTrack {
  artist: string;
  image: {
    size: string;
    "#text": string;
  }[];
  listeners: string;
  mbid: string;
  name: string;
  streamable: string;
  url: string;
}

export interface SearchTrack {
  results: { trackmatches: { track: ShortenedTrack[] } };
}

export interface UserTopTrack {
  toptracks: {
    track: {
      "@attr": { rank: string };
      artist: {
        url: string;
        name: string;
        mbid: string;
      };
      duration: string;
      image: {
        "#text": string;
        size: string;
      }[];
      mbid: string;
      name: string;
      playcount: string;
      url: string;
    }[];
  };
}
