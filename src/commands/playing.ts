import {
  Client,
  Colors,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import User from "../handlers/LastFM_components/User";
import cb from "../misc/codeblock";
import esm from "../misc/escapemarkdown";
import get_registered_users from "../misc/get_registered_users";
import truncate_str from "../misc/truncate";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("playing")
    .setDescription(
      "List tracks that are currently being played in the server"
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    response.allow_retry = true;
    const users = (await get_registered_users(bot, interaction))?.users;
    if (!users || users.length <= 0) {
      response.text = `No user in this guild has registered their Last.fm username; use ${cb(
        "/login"
      )}.`;
      return response;
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
      return response.error("lastfm_error");
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
        "It seems no one in this server is currently playing anything.";
      return response;
    }
    const stats = responses.map((response) => {
      const last_track = [...response.wrapper.data.recenttracks.track].shift();

      return {
        track: last_track,
        context: response.context,
      };
    });

    const embed = new EmbedBuilder()
      .setDescription(`**${stats.length}** user(s)`)
      .setColor(Colors.DarkGreen)
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

    response.paginate = true;
    response.paginate_embed = embed;
    response.paginate_data = data_list;
    response.paginate_elements = 5;
    return response;
  },
};
