import { MessageEmbed, User as DiscordUser } from "discord.js";
import moment from "moment";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import User from "../../handlers/LastFM_components/User";
import cb from "../../misc/codeblock";
import esm from "../../misc/escapemarkdown";
import search_user from "../../misc/search_user";
import time_difference from "../../misc/time_difference";
import truncate_str from "../../misc/truncate";

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

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(bot.models);
    let discord_user: DiscordUser | undefined;
    const server_prefix = bot.cache.prefix.get(message.guild);

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
    const user = await db.fetch_user(message.guild.id, discord_user.id);
    if (!user) return;

    const query = await new User({
      username: user.username,
      limit: 10,
    }).get_recenttracks();

    if (query.lastfm_errorcode || !query.success) {
      await response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }
    const recent_tracks = query.data.recenttracks.track.map((track, i) => {
      track.id = i;
      return track;
    });

    if (!recent_tracks || !recent_tracks.length) {
      response.text = `Couldn't find any scrobble on this account; check if your username is mispelled: ${cb(
        "mylogin",
        server_prefix
      )}.`;
      await response.send();
      return;
    }
    const embed = new MessageEmbed()
      .setTitle(`Recent tracks`)
      .setFooter(
        `Displaying recent ${recent_tracks.length} tracks played by ${discord_user.username}.`
      )
      .setColor(message.member?.displayColor || 0x0);
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
        `**${esm(track.artist["#text"], true)}** — [${esm(
          track.name,
          true
        )}](${truncate_str(track.url, 200)}) · ${esm(
          track.album["#text"],
          true
        )}`
      );
    }
    message.channel.send({ embeds: [embed] });
  }
}

export default RecentCommand;
