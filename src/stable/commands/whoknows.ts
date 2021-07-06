import { FieldsEmbed } from "discord-paginationembed";
import { TextChannel } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import Artist from "../../handlers/LastFM_components/Artist";
import User from "../../handlers/LastFM_components/User";
import { LeaderboardInterface } from "../../interfaces/LeaderboardInterface";
import cb from "../../misc/codeblock";
import esm from "../../misc/escapemarkdown";
import get_registered_users from "../../misc/get_registered_users";
import time_difference from "../../misc/time_difference";
import { CrownInterface } from "../models/Crowns";
import { LogInterface } from "../models/WhoPlaysLog";

class WhoKnowsCommand extends Command {
  constructor() {
    super({
      name: "whoknows",
      description:
        "Checks if anyone in a guild listens to a certain artist. " +
        "If no artist is defined, the bot will try to look up the artist you are " +
        "currently listening to.",
      usage: ["whoknows", "whoknows <artist name>"],
      aliases: ["w"],
      extra_aliases: ["whoknow", "wk", "whk", "wh", "zwingli"],
      examples: ["whoknows Kwoon", "whoknows Poppy"],
      require_login: true,
      required_permissions: ["MANAGE_MESSAGES"],
      category: "serverstat",
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = client.cache.prefix.get(message.guild);
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;

    const response = new BotMessage({ client, message, text: "", reply: true });
    const lastfm_user = new User({
      username: user.username,
    });

    // set minimum plays required to get a crown
    let min_plays_for_crown = 1;
    const server_config = client.cache.config.get(message.guild);
    if (server_config) min_plays_for_crown = server_config.min_plays_for_crown;

    let artist_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(client, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
    } else {
      artist_name = args.join(" ");
    }

    const query = await new Artist({
      name: artist_name,
      username: user.username,
    }).user_get_info();

    if (query.lastfm_errorcode || !query.success) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }

    const artist = query.data.artist;
    const users = (await get_registered_users(client, message))?.users;
    if (!users || users.length <= 0) {
      response.text = `No user in this guild has registered their Last.fm username; see ${cb(
        "help login",
        server_prefix
      )}`;
      await response.send();
      return;
    }

    if (users.length > 250) {
      users.length = 250;
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
        guild_id: message.guild.id,
      });
    });
    if (leaderboard.length <= 0) {
      response.text = `No one here listens to ${cb(artist.name)}.`;
      await response.send();
      return;
    }

    const last_log: LogInterface | undefined =
      await client.models.whoknowslog.findOne({
        artist_name: artist.name,
        guild_id: message.guild.id,
      });

    const last_crown: CrownInterface | undefined =
      await client.models.crowns.findOne({
        artistName: artist.name,
        guildID: message.guild.id,
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
    const fields_embed = new FieldsEmbed<typeof leaderboard[0]>()
      .setArray(leaderboard)
      .setAuthorizedUsers([])
      .setChannel(<TextChannel>message.channel)
      .setElementsPerPage(15)
      .setPageIndicator(true, "hybrid")
      .setDisabledNavigationEmojis(["delete"])
      .formatField(
        `${total_scrobbles} plays ― ${leaderboard.length} listener(s)\n`,
        (elem) => {
          let count_diff;
          let diff_str = "";
          if (elem.last_count) {
            count_diff =
              parseInt(elem.userplaycount) - parseInt(elem.last_count);
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
        }
      );
    if (min_count_text) {
      fields_embed.embed.addField("\u200b", min_count_text);
    }
    let footer_text = `Psst, try ${server_prefix}about to find the support server.`;
    if (last_log) {
      footer_text = `Last checked ${time_difference(last_log.timestamp)} ago.`;
    }
    fields_embed.embed
      .setColor(message.member?.displayColor || "000000")
      .setTitle(`Who knows ${esm(artist.name)}?`)
      .setFooter(footer_text);

    // delete if there's an existing crown for the artist in the server
    await db.delete_crown(top_user.artist_name, top_user.guild_id);

    if (
      parseInt(top_user.userplaycount) >= min_plays_for_crown &&
      !disallow_crown
    ) {
      fields_embed.on("start", () => {
        message.channel.stopTyping(true);
        if (last_crown) {
          const last_user = message.guild.members.cache.find(
            (user) => user.id === last_crown.userID
          );
          if (last_user && last_user.user.id !== top_user.user_id) {
            response.reply = false;
            response.text = `**${esm(
              top_user.discord_username
            )}** took the ${cb(artist.name)} crown from **${esm(
              last_user.user.username
            )}**.`;
            response.send();
          }
        }
      });
      await db.update_crown(top_user);
    } else {
      message.channel.stopTyping(true);
    }
    await db.log_whoknows(artist.name, leaderboard, message.guild.id);
    await fields_embed.build();
  }
}

export default WhoKnowsCommand;
