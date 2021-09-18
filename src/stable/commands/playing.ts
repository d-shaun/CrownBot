import { GuildMember, MessageEmbed } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import User from "../../handlers/LastFM_components/User";
import Paginate from "../../handlers/Paginate";
import cb from "../../misc/codeblock";
import esm from "../../misc/escapemarkdown";
import get_registered_users from "../../misc/get_registered_users";
import truncate_str from "../../misc/truncate";
class PlayingCommand extends Command {
  constructor() {
    super({
      name: "playing",
      description:
        "Displays list of songs being played in a server by registered users.",
      usage: ["playing"],
      aliases: ["pl", "play"],
      category: "serverstat",
    });
  }

  async run(bot: CrownBot, message: GuildMessage) {
    const server_prefix = bot.cache.prefix.get(message.guild);
    const response = new BotMessage({
      bot,
      message,
      reply: true,
    });

    const users = (await get_registered_users(bot, message))?.users;
    if (!users || users.length <= 0) {
      response.text = `No user in this guild has registered their Last.fm username; see ${cb(
        "help login",
        server_prefix
      )}`;
      await response.send();
      return;
    }

    if (users.length > bot.max_users) {
      users.length = bot.max_users;
    }
    const lastfm_requests = [];
    for await (const user of users) {
      const context = {
        discord_user: user.discord,
        lastfm_username: user.database.username,
      };
      lastfm_requests.push(
        new User({ username: user.database.username, limit: 1 })
          .get_recenttracks()
          .then((res) => {
            const response_with_context = {
              wrapper: res,
              context,
            };
            return response_with_context;
          })
      );
    }
    let responses = await Promise.all(lastfm_requests);
    if (!responses) {
      await response.error("lastfm_error");
      return;
    }
    responses = responses
      .filter((response) => response.wrapper.success)
      .filter((response) => {
        const last_track = [
          ...response.wrapper.data.recenttracks.track,
        ].shift();
        return last_track && last_track[`@attr`]?.nowplaying;
      });

    if (!responses.length) {
      response.text =
        "No one in this server is playing anything (or Last.fm is down).";
      await response.send();
      return;
    }
    const stats = responses.map((response) => {
      const last_track = [...response.wrapper.data.recenttracks.track].shift();

      return {
        track: last_track,
        context: response.context,
      };
    });

    const embed = new MessageEmbed()
      .setDescription(`**${stats.length}** user(s)`)
      .setColor(message.member?.displayColor || 0x0)
      .setTitle(`Now playing in the server`);

    const data_list = stats
      .map((res) => {
        const track = res.track;
        const user: GuildMember = res.context.discord_user;
        if (!track || !user) return false;
        const str = `**${esm(user.user.username)}**\n└ [${esm(
          track.name,
          true
        )}](${truncate_str(track.url, 200)}) · ${esm(
          track.album["#text"],
          true
        )} — **${esm(track.artist["#text"], true)}**\n`;
        return str.substring(0, 1020);
      })
      .filter((x): x is string => x !== false);

    const paginate = new Paginate(message, embed, data_list, 5, false);
    await paginate.send();
  }
}

export default PlayingCommand;
