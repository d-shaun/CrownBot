import SpotifyWebApi from "spotify-web-api-node";
import { Data } from "../commands/chart";
const { SPOTIFY_CLIENTID, SPOTIFY_CLIENTSECRET } = process.env;

interface CustomData extends Data {
  artist_name: string;
}

export interface SpotifyNowPlaying {
  is_spotify: boolean;
  image?: never;
  date?: never;
  "@attr"?: never;
  album: {
    "#text": string;
  };
  artist: {
    "#text": string;
  };
  name: string; // track name
}

export class Spotify {
  #clientid = SPOTIFY_CLIENTID;
  #clientsecret = SPOTIFY_CLIENTSECRET;

  #spotify_api = new SpotifyWebApi({
    clientId: this.#clientid,
    clientSecret: this.#clientsecret,
  });

  constructor() {
    if (!(this.#clientid && this.#clientsecret)) {
      throw "SPOTIFY_CLIENTID and/or SPOTIFY_CLIENTSECRET is missing.";
    }

    return this;
  }

  /**
   * Attaches Spotify access token to the instance of this class.
   */
  async attach_access_token() {
    const temporary_access = await this.#spotify_api.clientCredentialsGrant();
    if (temporary_access.statusCode !== 200) return false;
    this.#spotify_api.setAccessToken(temporary_access.body.access_token);
    return this;
  }

  /**
   * Searches for a track on Spotify
   */
  async search_track(search_query: string) {
    const query = await this.#spotify_api.searchTracks(search_query, {
      limit: 1,
    });
    const track = query.body.tracks?.items[0];
    if (query.statusCode !== 200 || !track) return;
    return track;
  }

  /**
   * Gets artist's images from Spotify.
   * @param artist_name
   * Name of the artist to search for on Spotify.
   * @param id
   * This ID, if specified, is sent back along with the artist's images. This useful for `Promises.all()`.
   */
  async get_artist_images(
    artist_name: string,
    id?: number
  ): Promise<{ images: SpotifyApi.ImageObject[]; id?: number } | undefined> {
    const query = await this.#spotify_api.searchArtists(artist_name, {
      limit: 1,
    });
    const artist = query.body.artists?.items[0];
    if (query.statusCode !== 200 || !artist) return;
    return { images: artist.images, id };
  }

  /**
   * Gets artist's images from Spotify.
   * @param artist_name
   *
   * @param track_name
   * Name of the track to search for on Spotify.
   *
   *
   * @param id
   * This ID, if specified, is sent back along with the track's images. This useful for `Promises.all()`.
   */

  async get_track_images(
    artist_name: string,
    track_name: string,
    id?: number
  ): Promise<{ images: SpotifyApi.ImageObject[]; id?: number } | undefined> {
    const query = await this.#spotify_api.searchTracks(
      `artist:${artist_name} track:${track_name}`,
      {
        limit: 1,
      }
    );
    const track = query.body.tracks?.items[0];
    if (query.statusCode !== 200 || !track) return;
    return { images: track.album.images, id };
  }

  /**
   * Outputs the input data with artists' images attached.
   *
   * @param data
   * The data formatted with `chart.ts`'s `format_artists()` method.
   *
   */

  async attach_artist_images(data: Data[]) {
    // assign ids
    let artists = data.map((d, i) => {
      d.id = i;
      return d;
    });

    const promises = artists.map((artist) => {
      return this.get_artist_images(artist.name, artist.id);
    });

    const responses = (await Promise.all(promises)).filter((res) => res);

    artists = artists.map((artist) => {
      const spotify_data = responses.find((res) => res?.id === artist.id);
      if (spotify_data) {
        artist.image_url = [...spotify_data.images].shift()?.url;
      }
      return artist;
    });

    return artists;
  }

  /**
   * Outputs the input data with tracks' images attached.
   *
   * @param data
   * The data formatted with `chart.ts`'s `format_tracks()` method.
   *
   */

  async attach_track_images(data: CustomData[]) {
    // assign ids
    let tracks = data.map((d, i) => {
      d.id = i;
      return d;
    });

    const promises = tracks.map((track) => {
      return this.get_track_images(track.artist_name, track.name, track.id);
    });

    const responses = (await Promise.all(promises)).filter((res) => res);

    tracks = tracks.map((track) => {
      const spotify_data = responses.find((res) => res?.id === track.id);
      if (spotify_data) {
        track.image_url = [...spotify_data.images].shift()?.url;
      }
      return track;
    });

    return tracks;
  }
}
