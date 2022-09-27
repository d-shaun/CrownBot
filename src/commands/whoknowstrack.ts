import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import time_difference from "../misc/time_difference";
import { Template } from "../classes/Template";
import Track from "../handlers/LastFM_components/Track";
import Paginate from "../handlers/Paginate";
import { LeaderboardInterface } from "../interfaces/LeaderboardInterface";
import cb from "../misc/codeblock";
import get_registered_users from "../misc/get_registered_users";
import { LogInterface } from "../models/WhoKnowsLog";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("whoknowstrack")
    .setDescription("Lists users who listen to a certain track.")
    .addStringOption((option) =>
      option
        .setName("track_name")
        .setDescription("Track name (defaults to now-playing)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("artist_name")
        .setDescription("The artist's name")
        .setRequired(false)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction
  ) {
    const response = new BotMessage({
      bot,
      interaction,
    });

    const db = new DB(bot.models);
    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (!user) return;
    const lastfm_user = new User({
      username: user.username,
    });

    let track_name = interaction.options.getString("track_name");
    let artist_name = interaction.options.getString("artist_name");

    if (!track_name) {
      const now_playing = await lastfm_user.get_nowplaying(bot, interaction);
      if (!now_playing) return;
      track_name = now_playing.name;
      artist_name = now_playing.artist["#text"];
    }

    if (!artist_name) {
      const query = await new Track({
        name: track_name,
        limit: 1,
      }).search();

      if (query.lastfm_errorcode || !query.success) {
        response.error("lastfm_error", query.lastfm_errormessage);
        return;
      }

      const track = query.data.results.trackmatches.track.shift();

      if (!track) {
        response.text = `Couldn't find the track.`;
        await response.send();
        return;
      }
      track_name = track.name;
      artist_name = track.artist;
    }

    const query = await new Track({
      name: track_name,
      artist_name,
      username: user.username,
    }).user_get_info();

    if (query.lastfm_errorcode || !query.success) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }

    const track = query.data.track;
    const users = (await get_registered_users(bot, interaction))?.users;

    if (!users || users.length <= 0) {
      response.text = `No user on this server has registered their Last.fm username; use the ${cb(
        "/login"
      )} command.`;
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
        new Track({
          name: track_name,
          artist_name,
          username: user.database.username,
        })
          .user_get_info()
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

    if (
      !responses.length ||
      responses.some((response) => !response?.wrapper.data?.track?.playcount)
    ) {
      response.text = new Template().get("lastfm_error");
      await response.send();
      return;
    }

    responses = responses.filter((response) => response.wrapper.success);

    let leaderboard: LeaderboardInterface[] = [];

    responses.forEach((response) => {
      const track = response.wrapper.data.track;
      const context = response.context;
      if (!context || !context.discord_user) return;
      if (track.userplaycount === undefined) return;
      if (parseInt(track.userplaycount) <= 0) return;
      leaderboard.push({
        track_name: track.name,
        artist_name: track.artist.name,
        discord_username: context.discord_user?.user.username,
        lastfm_username: context.lastfm_username,
        userplaycount: track.userplaycount,
        user_id: context.discord_user.user.id,
        user_tag: context.discord_user.user.tag,
        guild_id: interaction.guild.id,
      });
    });

    if (leaderboard.length <= 0) {
      response.text = `No one here has played ${cb(track.name)} by ${cb(
        track.artist.name
      )}.`;
      await response.send();
      return;
    }

    const last_log: LogInterface | null = await bot.models.whoplayslog.findOne({
      track_name: track.name,
      artist_name: track.artist.name,
      guild_id: interaction.guild.id,
    });
    if (last_log && last_log.stat) {
      const { stat } = last_log;
      leaderboard = leaderboard.map((entry) => {
        const log = stat.find((lg) => {
          return lg.user_id === entry.user_id;
        });
        if (log) {
          entry.last_count = log.userplaycount;
        }
        return entry;
      });
    }

    leaderboard = leaderboard.sort(
      (a, b) => parseInt(b.userplaycount) - parseInt(a.userplaycount)
    );
    const total_scrobbles = leaderboard.reduce(
      (a, b) => a + parseInt(b.userplaycount),
      0
    );

    const embed = new EmbedBuilder().setTitle(
      `Who knows the track ${cb(track.name)} by ${cb(track.artist.name)}?`
    );

    if (leaderboard.length >= 2) {
      embed.setDescription(
        `**${total_scrobbles}** plays ― **${leaderboard.length}** listener(s)`
      );
    }

    if (last_log)
      embed.setFooter({
        text: `Last checked ${time_difference(last_log.timestamp)} ago.`,
      });

    const data_list = leaderboard.map((elem) => {
      let count_diff;
      let diff_str = "";
      if (elem.last_count) {
        count_diff = parseInt(elem.userplaycount) - parseInt(elem.last_count);
      }
      if (count_diff && count_diff < 0) {
        diff_str = ` ― (:small_red_triangle_down: ${count_diff} ${
          count_diff > 1 ? "plays" : "play"
        })`;
      } else if (count_diff && count_diff > 0) {
        diff_str = ` ― (+${count_diff} ${count_diff > 1 ? "plays" : "play"})`;
      }

      return `${elem.discord_username} — **${elem.userplaycount} play(s)** ${diff_str}`;
    });
    const paginate = new Paginate(interaction, embed, data_list);
    await paginate.send();
    await db.log_whoplays(
      track.name,
      track.artist.name,
      leaderboard,
      interaction.guild.id
    );
  },
};
