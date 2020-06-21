import { Message, MessageEmbed, User } from "discord.js";
import moment from "moment";
import Command from "../classes/Command";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import { LastFM } from "../handlers/LastFM";
import { RecentTrackInterface } from "../interfaces/TrackInterface";
import cb from "../misc/codeblock";
import search_user from "../misc/search_user";
import time_difference from "../misc/time_difference";
class RecentCommand extends Command {
  constructor() {
    super({
      name: "recent",
      description: "Lists user's recently played songs.",
      usage: ["recent", "recent <@user>"],
      examples: ["recent"],
      aliases: ["r", "rc"],
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
    let discord_user: User | undefined;

    if (args.length > 0) {
      const mention = message.mentions.members?.first();
      discord_user = mention ? mention.user : search_user(message, args);
    } else {
      discord_user = message.member ? message.member.user : undefined;
    }
    if (!discord_user) {
      reply.text = "User not found.";
      await reply.send();
      return;
    }
    const user = await db.fetch_user(discord_user.id);
    if (!user) return;

    const { data } = await new LastFM().query({
      method: "user.getrecenttracks",
      params: {
        user: user.username,
        limit: 10,
      },
    });
    if (!data || !data.recenttracks) {
      reply.text = new Template(client, message).get("lastfm_error");
      await reply.send();
      return;
    }

    const recent_tracks: RecentTrackInterface[] = data.recenttracks.track.map(
      (track: RecentTrackInterface, i: number) => {
        track.id = i;
        return track;
      }
    );
    if (!recent_tracks || !recent_tracks.length) {
      reply.text = `Couldn't find any scrobble on this account; check if your username is mispelled: ${cb(
        "mylogin"
      )}.`;
      return;
    }
    const embed = new MessageEmbed()
      .setTitle(`Recent tracks`)
      .setFooter(
        `Displaying recent ${recent_tracks.length} tracks played by ${discord_user.username}.`
      )
      .setColor(message.member?.displayColor || "000000");
    for (const track of recent_tracks) {
      let time_str = "Unknown";
      if (track["@attr"]?.nowplaying) {
        time_str = "Playing";
      } else {
        const timestamp = moment.unix(parseInt(track.date.uts)).valueOf();
        time_str = time_difference(timestamp) + " ago";
      }
      embed.addField(
        time_str,
        `[${track.name}](${track.url}) · ${track.album["#text"]} — **${track.artist["#text"]}**`
      );
    }
    message.channel.send(embed);
  }
}

export default RecentCommand;