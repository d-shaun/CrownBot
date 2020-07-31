export interface UserinfoInterface {
  age: string;
  bootstrap: string;
  country: string;
  gender: string;
  image: {
    "#text": string;
    size: string;
  }[];
  name: string;
  playcount: string;
  playlists: string;
  realname: string;
  registered: {
    unixtime: string;
    "#text": number;
  };
  subscriber: string;
  type: string;
  url: string;
}
