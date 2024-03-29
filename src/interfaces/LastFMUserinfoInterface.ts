export interface UserinfoInterface {
  user: {
    age: string;
    bootstrap: string;
    country: string;
    gender: string;
    image: {
      "#text": string;
      size: string;
    }[];
    name: string;
    playcount: number;
    playlists: string;
    realname: string;
    registered: {
      unixtime: string;
      "#text": number;
    };
    subscriber: string;
    type: string;
    url: string;
  };
}
