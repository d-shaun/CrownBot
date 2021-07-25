import { MessageEmbed } from "discord.js";
import moment from "moment";
// @ts-ignore
import abbreviate from "number-abbreviate";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import Artist from "../../handlers/LastFM_components/Artist";
import User from "../../handlers/LastFM_components/User";
import { UserArtist } from "../../interfaces/ArtistInterface";
import esm from "../../misc/escapemarkdown";
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
      category: "userstat",
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const db = new DB(bot.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    const response = new BotMessage({ bot, message, reply: true });

    if (!user) return;
    const lastfm_user = new User({
      username: user.username,
    });

    let artist_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(bot, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
    } else {
      artist_name = args.join(" ");
    }

    const query = await new Artist({
      name: artist_name,
      username: user.username,
    }).user_get_info();

    if (query.lastfm_errorcode || !query.success) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }

    const artist = query.data.artist;

    let last_count = 0;
    const strs = {
      count: "No change",
      time: <boolean | string>false,
    };
    const last_log = await bot.models.artistlog.findOne(<ArtistLogInterface>{
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
        `**${esm(artist.name)}** — **${
          artist.stats.userplaycount
        } play(s)** \n\n (**${percentage}%** of ${abbreviate(
          artist.stats.playcount,
          1
        )} plays) \n\n ${aggr_str}`
      );
    await this.update_log(bot, message, artist);
    await message.channel.send({ embeds: [embed] });
  }

  async update_log(
    client: CrownBot,
    message: GuildMessage,
    artist: UserArtist["artist"]
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
        useFindAndModify: false,
      }
    );
  }
}

export default ArtistPlaysCommand;
