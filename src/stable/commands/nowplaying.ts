import { MessageEmbed, User as DiscordUser } from "discord.js";

import moment from "moment";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import User from "../../handlers/LastFM_components/User";
import esm from "../../misc/escapemarkdown";
import search_user from "../../misc/search_user";
import time_difference from "../../misc/time_difference";

class NowPlayingCommand extends Command {
  constructor() {
    super({
      name: "nowplaying",
      description: "Displays user's 'now-playing' or the last scrobbled track.",
      usage: ["nowplaying"],
      aliases: ["np", "fm"],
      require_login: true,
      category: "userstat",
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const response = new BotMessage({
      client,
      message,
      reply: true,
    });
    const db = new DB(client.models);

    let discord_user: DiscordUser | undefined;

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

    const lastfm_user = new User({ username: user.username, limit: 2 });
    const query = await lastfm_user.get_recenttracks();
    if (!query.success || query.lastfm_errorcode) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }

    const last_song = [...query.data.recenttracks.track].shift();
    if (!last_song) {
      response.text =
        "Couldn't find **any** scrobbled track on your Last.fm account.";
      await response.send();
      return;
    }
    let status_text = "🎵 playing now";

    if (!last_song["@attr"]?.nowplaying) {
      const timestamp = moment.unix(parseInt(last_song.date.uts)).valueOf();
      status_text = "⏹️ scrobbled " + time_difference(timestamp) + " ago";
    }
    const cover = last_song.image.pop();
    const embed = new MessageEmbed()
      .setTitle("Now playing · " + discord_user.username)
      .setDescription(
        `**${esm(last_song.name)}** by **${esm(
          last_song.artist["#text"]
        )}**\n*${esm(last_song.album["#text"])}*`
      )
      .setFooter(status_text);
    if (cover) embed.setThumbnail(cover["#text"]);
    await message.channel.send(embed);
  }
}

export default NowPlayingCommand;
