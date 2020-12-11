import { Message, MessageEmbed, User } from "discord.js";
import moment from "moment";
import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import { LastFM } from "../../handlers/LastFM";
import { RecentTrackInterface } from "../../interfaces/TrackInterface";
import cb from "../../misc/codeblock";
import esm from "../../misc/escapemarkdown";
import search_user from "../../misc/search_user";
import time_difference from "../../misc/time_difference";

class RecentCommand extends Command {
  constructor() {
    super({
      name: "recent",
      description: "Lists user's recently played songs.",
      usage: ["recent", "recent <@user>"],
      examples: ["recent"],
      aliases: ["r", "rc"],
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
    let discord_user: User | undefined;

    if (args.length > 0) {
      const mention = message.mentions.members?.first();
      discord_user = mention ? mention.user : await search_user(message, args);
    } else {
      discord_user = message.member ? message.member.user : undefined;
    }
    if (!discord_user) {
      response.text = "User not found.";
      await response.send();
      return;
    }
    const user = await db.fetch_user(message.guild?.id, discord_user.id);
    if (!user) return;

    const { data } = await new LastFM().query({
      method: "user.getrecenttracks",
      params: {
        user: user.username,
        limit: 10,
      },
    });
    if (!data || !data.recenttracks) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    const recent_tracks: RecentTrackInterface[] = data.recenttracks.track.map(
      (track: RecentTrackInterface, i: number) => {
        track.id = i;
        return track;
      }
    );
    if (!recent_tracks || !recent_tracks.length) {
      response.text = `Couldn't find any scrobble on this account; check if your username is mispelled: ${cb(
        "mylogin"
      )}.`;
      await response.send();
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
        `**${esm(track.artist["#text"])}** — [${esm(track.name)}](${
          track.url
        }) · ${esm(track.album["#text"])}`
      );
    }
    message.channel.send(embed);
  }
}

export default RecentCommand;
