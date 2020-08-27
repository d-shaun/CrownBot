import { Message, MessageEmbed } from "discord.js";
import moment from "moment";
// @ts-ignore
import abbreviate from "number-abbreviate";
import Command from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import { LastFM } from "../../handlers/LastFM";
import LastFMUser from "../../handlers/LastFMUser";
import { ArtistInterface } from "../../interfaces/ArtistInterface";
import time_difference from "../../misc/time_difference";
import { ArtistLogInterface } from "../models/ArtistLog";

class ArtistPlaysCommand extends Command {
  constructor() {
    super({
      name: "artistplays",
      description: "Displays user's play count of an artist.",
      usage: ["artistplays", "artistplays <artist name>"],
      aliases: ["a", "ap", "apl"],
      examples: ["artistplays Devin Townsend", "artistplays Joy Division"],
      require_login: true,
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild?.id, message.author.id);
    const response = new BotMessage({ client, message, text: "", reply: true });

    if (!user) return;

    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    let artist_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(client, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
    } else {
      artist_name = args.join(" ");
    }
    const { status, data } = await new LastFM().query({
      method: "artist.getinfo",
      params: {
        artist: artist_name,
        username: user.username,
        autocorrect: 1,
      },
    });

    if (data.error || !data.artist) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    const artist: ArtistInterface = data.artist;
    if (!artist.stats.userplaycount) return;
    let last_count = 0;
    let strs = {
      count: "No change",
      time: <boolean | string>false,
    };
    const last_log = await client.models.artistlog.findOne(<ArtistLogInterface>{
      name: artist.name,
      userID: message.author.id,
    });
    if (last_log) {
      last_count = last_log.userplaycount;
      strs.time = time_difference(last_log.timestamp);
    }
    const count_diff = parseInt(artist.stats.userplaycount) - last_count;
    if (count_diff < 0) {
      strs.count = `:small_red_triangle_down: ${count_diff}`;
    } else if (count_diff > 0) {
      strs.count = `+${count_diff}`;
    }
    const aggr_str = strs.time
      ? `**${strs.count}** since last checked ${strs.time} ago.`
      : "";
    const percentage = (
      (parseInt(artist.stats.userplaycount) /
        parseInt(artist.stats.playcount)) *
      100
    ).toFixed(2);
    const embed = new MessageEmbed()
      .setTitle(`Artist plays`)
      .setDescription(
        `**${artist.name}** — **${
          artist.stats.userplaycount
        } play(s)** \n\n (**${percentage}%** of ${abbreviate(
          artist.stats.playcount,
          1
        )} plays) \n\n ${aggr_str}`
      );
    await this.update_log(client, message, artist);
    await message.channel.send(embed);
  }

  async update_log(
    client: CrownBot,
    message: Message,
    artist: ArtistInterface
  ) {
    const timestamp = moment.utc().valueOf();

    await client.models.artistlog.findOneAndUpdate(
      <ArtistLogInterface>{
        name: artist.name,
        userID: message.author.id,
      },
      {
        name: artist.name,
        userID: message.author.id,
        userplaycount: artist.stats.userplaycount,
        timestamp,
      },
      {
        upsert: true,
        // @ts-ignore
        useFindAndModify: false,
      }
    );
  }
}

export default ArtistPlaysCommand;
