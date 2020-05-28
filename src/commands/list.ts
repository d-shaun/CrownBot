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
      beta: true,
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const reply = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.author.id);
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
      reply.text = `Invalid arguments passed; see ${cb(
        "help list",
        server_prefix
      )}.`;
      await reply.send();
      return;
    }

    if (config.type === "artist") {
      let query = await lastfm_user.get_top_artists({
        limit: config.limit,
        period: config.period.value,
      });
      if (!query.topartists || !query.topartists.artist) {
        reply.text = new Template(client, message).get("lastfm_error");
        await reply.send();
        return;
      }
      const top_artists: TopArtistInterface[] = query.topartists.artist;

      const embed_list = top_artists
        .map((artist) => {
          return `${artist["@attr"].rank}. **${artist.name}** — **${artist.playcount}** plays`;
        })
        .join("\n");

      const embed = new MessageEmbed()
        .setTitle(
          `${message.author.username}'s ${config.period.text}-top ${config.type}s`
        )
        .setDescription(embed_list);

      await message.channel.send(embed);
    } else if (config.type === "song") {
      let query = await lastfm_user.get_top_tracks({
        limit: config.limit,
        period: config.period.value,
      });
      if (!query.toptracks || !query.toptracks.track) {
        reply.text = new Template(client, message).get("lastfm_error");
        await reply.send();
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
