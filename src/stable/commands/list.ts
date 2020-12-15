import { MessageEmbed } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import User from "../../handlers/LastFM_components/User";
import { UserTopArtist } from "../../interfaces/ArtistInterface";
import { Period } from "../../interfaces/LastFMQueryInterface";
import cb from "../../misc/codeblock";
import esm from "../../misc/escapemarkdown";
import time_difference from "../../misc/time_difference";

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
      category: "userstat",
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = client.cache.prefix.get(message.guild);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;
    const lastfm_user = new User({
      username: user.username,
    });

    const config = {
      type: <undefined | string>undefined,
      period: {
        text: "",
        value: <Period | undefined>"",
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
      const length = parseInt(args[2]);
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
    lastfm_user.configs.limit = config.limit;

    if (!config.type || !config.period.value) {
      response.text = `Invalid arguments passed; see ${cb(
        "help list",
        server_prefix
      )}.`;
      await response.send();
      return;
    }

    if (config.type === "artist") {
      const query = await lastfm_user.get_top_artists({
        period: config.period.value,
      });
      if (query.lastfm_errorcode || !query.success) {
        response.error("lastfm_error", query.lastfm_errormessage);
        return;
      }
      let top_artists = query.data.topartists.artist;

      let last_log: any | null = null;
      if (config.period.value === "overall") {
        last_log = await client.models.listartistlog.findOne({
          user_id: message.author.id,
          guild_id: message.guild.id,
        });
      }

      let cached_log: UserTopArtist["topartists"]["artist"];
      if (last_log && last_log.stat.length) {
        cached_log = last_log.stat;
      } else {
        cached_log = [];
      }

      top_artists = top_artists.map((entry) => {
        const log = cached_log.find((lg) => {
          return lg.name === entry.name;
        });
        if (log) {
          entry.last_count = log.playcount;
        } else {
          entry.is_new = true;
        }
        return entry;
      });

      cached_log = cached_log.filter((elem) => {
        // remove the older ones that are still available
        return !top_artists.find((el) => el.name === elem.name);
      });

      // combine the newer one with the one in db. ^ this filter removes duplicates.
      cached_log = [...top_artists, ...cached_log];

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

          return `${artist["@attr"].rank}. **${esm(artist.name)}** — **${
            artist.playcount
          }** plays ${diff_str}`;
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
          cached_log,
          message.author.id,
          message.guild.id
        );
      }
      await message.channel.send(embed);
    } else if (config.type === "song") {
      const query = await lastfm_user.get_top_tracks({
        period: config.period.value,
      });
      if (query.lastfm_errorcode || !query.success) {
        response.error("lastfm_error", query.lastfm_errormessage);
        return;
      }
      const top_tracks = query.data.toptracks.track;
      const embed_list = top_tracks
        .map((track) => {
          return `${track["@attr"].rank}. **${esm(track.name)}** by **${esm(
            track.artist.name
          )}**— **${track.playcount}** plays`;
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
