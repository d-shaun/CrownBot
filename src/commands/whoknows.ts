import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import Artist from "../handlers/LastFM_components/Artist";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";
import time_difference from "../misc/time_difference";
import Paginate from "../handlers/Paginate";
import { LeaderboardInterface } from "../interfaces/LeaderboardInterface";
import cb from "../misc/codeblock";
import get_registered_users from "../misc/get_registered_users";
import { CrownInterface } from "../models/Crowns";
import { LogInterface } from "../models/WhoKnowsLog";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("whoknows")
    .setDescription("Lists users who listen to a certain artist.")
    .addStringOption((option) =>
      option
        .setName("artist_name")
        .setDescription("Artist name (defaults to now-playing)")
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

    let artist_name = interaction.options.getString("artist_name");
    if (!artist_name) {
      const now_playing = await lastfm_user.get_nowplaying(bot, interaction);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
    }

    const query = await new Artist({
      name: artist_name,
      username: user.username,
    }).user_get_info();

    if (query.lastfm_errorcode || !query.success) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }

    // set minimum plays required to get a crown
    let min_plays_for_crown = 1;
    const server_config = bot.cache.config.get(interaction.guild);
    if (server_config) min_plays_for_crown = server_config.min_plays_for_crown;

    const artist = query.data.artist;

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
        new Artist({
          name: artist_name,
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
      responses.some(
        (response) => !response?.wrapper.data?.artist?.stats?.playcount // sanity check
      )
    ) {
      await response.error("lastfm_error");
      return;
    }

    responses = responses.filter((response) => response.wrapper.success);
    let leaderboard: LeaderboardInterface[] = [];

    responses.forEach((response) => {
      const artist = response.wrapper.data.artist;
      const context = response.context;
      if (!context || !context.discord_user) return;
      if (artist.stats.userplaycount === undefined) return;
      if (parseInt(artist.stats.userplaycount) <= 0) return;

      leaderboard.push({
        artist_name: artist.name,
        discord_username: context.discord_user?.user.username,
        lastfm_username: context.lastfm_username,
        userplaycount: artist.stats.userplaycount,
        user_id: context.discord_user.user.id,
        user_tag: context.discord_user.user.tag,
        guild_id: interaction.guild.id,
      });
    });
    if (leaderboard.length <= 0) {
      response.text = `No one here listens to ${cb(artist.name)}.`;
      await response.send();
      return;
    }

    const last_log: LogInterface | null = await bot.models.whoknowslog.findOne({
      artist_name: artist.name,
      guild_id: interaction.guild.id,
    });

    const last_crown: CrownInterface | null = await bot.models.crowns.findOne({
      artistName: artist.name,
      guildID: interaction.guild.id,
    });
    if (last_log && last_log.stat) {
      const { stat } = last_log;
      leaderboard = leaderboard.map((entry) => {
        const log = stat.find((lg) => {
          return lg.user_id === entry.user_id;
        });
        if (log) {
          entry.last_count = log.userplaycount;
        } else {
          entry.is_new = true;
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
    const top_user = leaderboard[0];
    let disallow_crown = false;
    let min_count_text;
    if (parseInt(top_user.userplaycount) < min_plays_for_crown) {
      min_count_text = `(>=${min_plays_for_crown} plays required for the crown.)`;
    } else {
      if (leaderboard.length >= 2) {
        const [first_user, second_user] = leaderboard;
        if (first_user.userplaycount === second_user.userplaycount) {
          // disallow crown if #1 and #2 have the same amount of scrobbles.
          disallow_crown = true;
          min_count_text = `(Equal amount of scrobbles—nobody acquired the crown.)`;
        }
      }
    }

    const embed = new EmbedBuilder().setTitle(`Who knows ${esm(artist.name)}?`);

    if (leaderboard.length >= 2) {
      embed.setDescription(
        `**${total_scrobbles}** plays — **${leaderboard.length}** listeners`
      );
    }
    let footer_text = "";
    if (min_count_text) {
      footer_text = min_count_text + "\n";
    }
    if (last_log) {
      footer_text += `Last checked ${time_difference(last_log.timestamp)} ago.`;
    }
    if (footer_text) embed.setFooter({ text: footer_text });
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
      if (elem.is_new) {
        diff_str = " ― :new:";
      }
      const index =
        leaderboard.findIndex((e) => e.user_id === elem.user_id) + 1;

      const indicator = `${
        index === 1 &&
        !disallow_crown &&
        parseInt(elem.userplaycount) >= min_plays_for_crown
          ? ":crown:"
          : index + "."
      }`;
      return `${indicator} ${elem.discord_username} — **${elem.userplaycount} play(s)** ${diff_str}`;
    });

    const paginate = new Paginate(
      interaction,
      embed,
      data_list,
      undefined,
      false
    );
    await paginate.send();

    // delete if there's an existing crown for the artist in the server
    await db.delete_crown(top_user.artist_name, top_user.guild_id);

    if (
      parseInt(top_user.userplaycount) >= min_plays_for_crown &&
      !disallow_crown
    ) {
      if (last_crown) {
        const last_user = interaction.guild.members.cache.find(
          (user) => user.id === last_crown.userID
        );
        if (last_user && last_user.user.id !== top_user.user_id) {
          response.text = `**${esm(top_user.discord_username)}** took the ${cb(
            artist.name
          )} crown from **${esm(last_user.user.username)}**.`;
          await response.send(true);
        }
      }
      await db.update_crown(top_user);
    }
    await db.log_whoknows(artist.name, leaderboard, interaction.guild.id);
  },
};
