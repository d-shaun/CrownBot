import { Message, MessageEmbed } from "discord.js";
import Command from "../classes/Command";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import LastFMUser from "../handlers/LastFMUser";
import { TopArtistInterface } from "../interfaces/ArtistInterface";
import { TopTrackInterface } from "../interfaces/TrackInterface";
import cb from "../misc/codeblock";
import time_difference from "../misc/time_difference";
import { ListArtistLogInterface } from "../models/ListArtistLog";
class ListCommand extends Command {
  constructor() {
    super({
      name: "list",
      description:
        "Lists user's weekly, monthly, or yearly top artists or songs.",
      usage: ["list <type> <period>"],
      examples: [
        "list artist weekly",
        "list song weekly",
        "list artist alltime",
        "l a w",
        "l s w",
        "l a a",
      ],
      aliases: ["l"],
      require_login: true,
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild?.id, message.author.id);
    if (!user) return;
    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    let config = {
      type: <undefined | string>undefined,
      period: {
        text: "",
        value: <string | undefined>"",
      },
      limit: 10,
    };
    switch (args[0]) {
      case "a":
      case "artist":
      case "artists":
        config.type = "artist";
        break;

      case "s":
      case "song":
      case "songs":
        config.type = "song";
        break;

      case undefined:
        config.type = `artist`;
        break;

      default:
        config.type = undefined;
        break;
    }
    switch (args[1]) {
      case `a`:
      case `alltime`:
      case `o`:
      case `overall`:
        config.period.text = `all-time`;
        config.period.value = `overall`;
        break;
      case `w`:
      case `weekly`:
        config.period.text = `weekly`;
        config.period.value = `7day`;
        break;
      case `monthly`:
      case `m`:
        config.period.text = `monthly`;
        config.period.value = `1month`;
        break;
      case `yearly`:
      case `y`:
        config.period.text = `yearly`;
        config.period.value = `12month`;
        break;
      case undefined:
        config.period.text = `weekly`;
        config.period.value = `7day`;
        break;
      default:
        config.period.value = undefined;
    }

    if (args[2]) {
      let length = parseInt(args[2]);
      if (isNaN(length)) {
        message.reply(
          "invalid size argument; see `" + server_prefix + "help list`."
        );
        return;
      }
      if (length > 30 || length < 0) {
        message.reply("list size cannot be less than 0 or greater than 30.");
        return;
      }
      config.limit = length;
    } else {
      config.limit = 10;
    }

    if (!config.type || !config.period.value) {
      response.text = `Invalid arguments passed; see ${cb(
        "help list",
        server_prefix
      )}.`;
      await response.send();
      return;
    }

    if (config.type === "artist") {
      let query = await lastfm_user.get_top_artists({
        limit: config.limit,
        period: config.period.value,
      });
      if (!query.topartists || !query.topartists.artist) {
        response.text = new Template(client, message).get("lastfm_error");
        await response.send();
        return;
      }
      let top_artists: TopArtistInterface[] = query.topartists.artist;

      let last_log: ListArtistLogInterface | undefined;
      if (config.period.value === "overall") {
        last_log = await client.models.listartistlog.findOne({
          user_id: message.author.id,
          guild_id: message.guild?.id,
        });
      }

      if (last_log && last_log.stat) {
        const { stat } = last_log;
        top_artists = top_artists.map((entry) => {
          const log = stat.find((lg) => {
            return lg.name === entry.name;
          });
          if (log) {
            entry.last_count = log.playcount;
          } else {
            entry.is_new = true;
          }
          return entry;
        });
      }
      const embed_list = top_artists
        .map((artist) => {
          let count_diff;
          let diff_str = "";
          if (artist.last_count) {
            count_diff =
              parseInt(artist.playcount) - parseInt(artist.last_count);
          }

          if (count_diff && count_diff < 0) {
            diff_str = ` ― (:small_red_triangle_down: ${count_diff} ${
              count_diff > 1 ? "plays" : "play"
            })`;
          } else if (count_diff && count_diff > 0) {
            diff_str = ` ― (+${count_diff} ${
              count_diff > 1 ? "plays" : "play"
            })`;
          }

          if (artist.is_new) {
            diff_str = " ― :new:";
          }
          return `${artist["@attr"].rank}. **${artist.name}** — **${artist.playcount}** plays ${diff_str}`;
        })
        .join("\n");

      const embed = new MessageEmbed()
        .setTitle(
          `${message.author.username}'s ${config.period.text}-top ${config.type}s`
        )
        .setDescription(embed_list);
      if (last_log) {
        embed.setFooter(
          `Last checked ${time_difference(last_log.timestamp)} ago.`
        );
      }
      if (config.period.value === "overall" && message.guild) {
        await db.log_list_artist(
          top_artists,
          message.author.id,
          message.guild.id
        );
      }

      await message.channel.send(embed);
    } else if (config.type === "song") {
      let query = await lastfm_user.get_top_tracks({
        limit: config.limit,
        period: config.period.value,
      });
      if (!query.toptracks || !query.toptracks.track) {
        response.text = new Template(client, message).get("lastfm_error");
        await response.send();
        return;
      }
      const top_tracks: TopTrackInterface[] = query.toptracks.track;
      const embed_list = top_tracks
        .map((track) => {
          return `${track["@attr"].rank}. **${track.name}** by **${track.artist.name}**— **${track.playcount}** plays`;
        })
        .join("\n");

      const embed = new MessageEmbed()
        .setTitle(
          `${message.author.username}'s ${config.period.text}-top ${config.type}s`
        )
        .setDescription(embed_list);
      await message.channel.send(embed);
    }
  }
}

export default ListCommand;
