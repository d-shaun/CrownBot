import {
  AttachmentBuilder,
  BufferResolvable,
  Client,
  SlashCommandBuilder,
} from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import { Spotify } from "../handlers/Spotify";
import { LastFMResponse } from "../interfaces/LastFMResponseInterface";
import { UserRecentTrack } from "../interfaces/TrackInterface";

import axios, { Method, ResponseType } from "axios";
import { promises as fs } from "fs";
import path from "path";
import GLOBALS from "../../GLOBALS";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("highlights")
    .setDescription("See your weekly highlights"),
  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    const db = new DB(bot.models);
    const discord_user = interaction.user;
    const user = await db.fetch_user(interaction.guild.id, discord_user.id);
    if (!user) {
      response.text = "User is not logged in.";
      return response;
    }

    const lastfm_user = new User({ username: user.username, limit: 10 });

    const query = await lastfm_user.get_top_artists({
      period: "7day",
    });

    const topartists = query.data.topartists.artist;
    const spotify = new Spotify();
    let ARTISTS; // send this to template

    try {
      await spotify.attach_access_token().catch(() => {
        throw "Failed authenticating.";
      });

      const map = topartists.map((elem) => {
        return {
          name: elem.name,
          playcount: elem.playcount,
        };
      });
      ARTISTS = await spotify.attach_artist_images(map);
    } catch {
      return response.error("spotify_connect");
    }

    const today = new Date();
    const one_week_ago = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - 7,
        today.getUTCHours(),
        today.getUTCMinutes(),
        today.getUTCSeconds()
      )
    );

    const utc_unix = Math.floor(one_week_ago.getTime() / 1000);

    lastfm_user.configs.limit = 190; // 190 entries per page (which is 10: 190*10)
    const DATAPOINTS: number[] = []; // send this to template -- array of utc unix timestamps

    const add_to_datapoints = (query: LastFMResponse<UserRecentTrack>) => {
      const new_data = query.data.recenttracks.track
        .filter((track) => track.date) // filters out nowplaying (and idk what else that might cause that?)
        .map((track) => parseInt(track.date.uts));
      DATAPOINTS.push(...new_data);
    };

    const recents = await lastfm_user.get_recenttracks({
      from: utc_unix,
    });

    add_to_datapoints(recents);
    const total_pages = parseInt(recents.data.recenttracks["@attr"].totalPages);
    const looping_pages = total_pages > 10 ? 10 : total_pages; // limit to 10 pages
    const promises = [];

    for (let pageIndex = 2; pageIndex <= looping_pages; pageIndex++) {
      promises.push(
        lastfm_user
          .get_recenttracks({
            from: utc_unix,
            page: pageIndex,
          })
          .then((data) => add_to_datapoints(data))
      );
    }

    await Promise.all(promises);

    const file_path = path.resolve(__dirname, "../../../html/highlights.html");

    const template_html = await fs.readFile(file_path);

    const data_code = `
    const LASTFM_USERNAME="${lastfm_user.username}";
    const ARTISTS=${JSON.stringify(ARTISTS)};
    const DATAPOINTS=${JSON.stringify(DATAPOINTS)};
    `;

    const injected_html = template_html
      .toString()
      .replace("//DATA_PLACEHOLDER//", data_code);

    const method: Method = "post";
    const responseType: ResponseType = "arraybuffer";

    const options = {
      responseType,
      method,
      url: "https://crownbotutils.onrender.com/screencap",
      headers: { "Content-Type": "text/plain" },
      data: injected_html,
      timeout: GLOBALS.GENERAL_TIMEOUT,
    };
    const data_res: any = <any>(
      await axios.request(options).catch(console.error)
    );
    if (data_res.status !== 200) return response.fail();

    const img: BufferResolvable | undefined = Buffer.from(data_res.data);
    if (!img) return response.fail();

    const attachment = new AttachmentBuilder(img, {
      name: "chart.png",
    });

    response.files = [attachment];
    return response;
  },
};
