import { Message } from "discord.js";
import { Template } from "../classes/Template";
import { RecentTrackInterface } from "../interfaces/TrackInterface";
import BotMessage from "./BotMessage";
import CrownBot from "./CrownBot";
import { LastFM } from "./LastFM";
export default class LastFMUser {
  username: string;
  discord_id?: string;
  constructor({ username, discord_ID }: { [key: string]: string }) {
    if (!username && !discord_ID) {
      throw "Failed to initialize new LastFMUser without username and Discord ID.";
    }
    this.username = username;
    this.discord_id = discord_ID;

    return this;
  }

  set_username(username: string) {
    this.username = username;
  }

  async get_nowplaying(
    client: CrownBot,
    message: Message
  ): Promise<RecentTrackInterface | undefined> {
    const { data } = await new LastFM().query({
      method: "user.getrecenttracks",
      params: {
        user: this.username,
        limit: 1,
      },
    });
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    if (data.error) {
      if (data.error === 6) {
        response.text =
          "User ``" +
          this.username +
          "`` doesn't exist on Last.fm; please try logging out and in again.";
      } else {
        response.text = new Template(client, message).get("lastfm_error");
      }
      await response.send();
      return undefined;
    }
    const last_track = data.recenttracks.track[0];
    if (last_track[`@attr`] && last_track[`@attr`].nowplaying) {
      return last_track;
    } else {
      response.text = "You aren't playing anything.";
      await response.send();
      return undefined;
    }
  }

  async get_top_artists(config: { limit: number; period: string }) {
    const { data } = await new LastFM().query({
      method: "user.getTopArtists",
      params: {
        user: this.username,
        period: config.period,
        limit: config.limit,
      },
    });
    return data;
  }
  async get_top_tracks(config: { limit: number; period: string }) {
    const { data } = await new LastFM().query({
      method: "user.getTopTracks",
      params: {
        user: this.username,
        period: config.period,
        limit: config.limit,
      },
    });
    return data;
  }
}
