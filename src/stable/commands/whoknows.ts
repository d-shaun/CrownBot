import { AxiosResponse } from "axios";
import { FieldsEmbed } from "discord-paginationembed";
import { GuildMember, Message, TextChannel } from "discord.js";
import Command from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import { LastFM, ResponseInterface } from "../../handlers/LastFM";
import LastFMUser from "../../handlers/LastFMUser";
import { ArtistInterface } from "../../interfaces/ArtistInterface";
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
      extra_aliases: ["whoknow", "wk", "whk", "wh"],
      examples: ["whoknows Kwoon", "whoknows Poppy"],
      require_login: true,
      required_permissions: ["MANAGE_MESSAGES"],
      category: "serverstat",
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = client.cache.prefix.get(message.guild);
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild?.id, message.author.id);
    if (!user) return;
    if (!message.guild) return;

    const response = new BotMessage({ client, message, text: "", reply: true });
    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    // set minimum plays required to get a crown
    let min_plays_for_crown = 1;
    const server_config = client.get_cached_config(message);
    if (server_config) min_plays_for_crown = server_config.min_plays_for_crown;

    let artist_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(client, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
    } else {
      artist_name = args.join(" ");
    }
    const { status, data } = await new LastFM().query({
      method: "artist.getinfo",
      params: {
        artist: artist_name,
        username: user.username,
        autocorrect: 1,
      },
    });

    if (data.error === 6) {
      response.text = "Artist not found.";
      response.send();
      return;
    } else if (status !== 200 || !data.artist) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    const artist: ArtistInterface = data.artist;
    const users = (await get_registered_users(client, message))?.users;
    if (!users || users.length <= 0) {
      response.text = `No user in this guild has registered their Last.fm username; see ${cb(
        "help login",
        server_prefix
      )}`;
      await response.send();
      return;
    }

    if (users.length > 100) {
      users.length = 100; // 100 user limit
    }
    const lastfm_requests = [];

    for await (const user of users) {
      const context = {
        discord_user: user.discord,
        lastfm_username: user.database.username,
      };
      lastfm_requests.push(
        new LastFM()
          .query({
            method: "artist.getinfo",
            params: {
              artist: artist_name,
              username: user.database.username,
              autocorrect: 1,
            },
          })
          .then((res) => {
            // check if response is an object because Last.fm has now started serving empty string
            if (res && typeof res.data === "object") res.data.context = context;
            return res;
          })
      );
    }
    let responses: ResponseInterface[] = [];
    await Promise.all(lastfm_requests).then((res) => (responses = res));

    if (
      !responses.length ||
      responses.some((response) => !response?.data?.artist?.stats?.playcount)
    ) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    responses = responses
      .filter((response) => response.status !== 404)
      .filter((response) => {
        // filter out users who have deleted their Last.fm account
        const artist: ArtistInterface = response.data.artist;
        return !(artist && !artist.stats.userplaycount);
      });

    let leaderboard: LeaderboardInterface[] = [];

    interface ContextInterface {
      discord_user: GuildMember;
      lastfm_username: string;
    }

    responses.forEach(({ data }) => {
      const artist: ArtistInterface = data.artist;
      const context: ContextInterface = data.context;
      if (!context || !context.discord_user) return;
      if (!artist.stats.userplaycount) return;
      if (parseInt(artist.stats.userplaycount) <= 0) return;

      leaderboard.push({
        artist_name: artist.name,
        discord_username: context.discord_user?.user.username,
        lastfm_username: context.lastfm_username,
        userplaycount: artist.stats.userplaycount,
        user_id: context.discord_user.user.id,
        user_tag: context.discord_user.user.tag,
        guild_id: message.guild?.id,
      });
    });
    if (leaderboard.length <= 0) {
      response.text = `No one here listens to ${cb(artist.name)}.`;
      await response.send();
      return;
    }

    const last_log:
      | LogInterface
      | undefined = await client.models.whoknowslog.findOne({
      artist_name: artist.name,
      guild_id: message.guild.id,
    });

    const last_crown:
      | CrownInterface
      | undefined = await client.models.crowns.findOne({
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
    const fields_embed = new FieldsEmbed()
      .setArray(leaderboard)
      .setAuthorizedUsers([])
      .setChannel(<TextChannel>message.channel)
      .setElementsPerPage(15)
      .setPageIndicator(true, "hybrid")
      .setDisabledNavigationEmojis(["delete"])
      .formatField(
        `${total_scrobbles} plays ― ${leaderboard.length} listener(s)\n`,
        (el: any) => {
          const elem: LeaderboardInterface = el;
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
            el.userplaycount >= min_plays_for_crown
              ? ":crown:"
              : index + "."
          }`;
          return `${indicator} ${el.discord_username} — **${el.userplaycount} play(s)** ${diff_str}`;
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
        if (!message.guild) throw "won't happen, TS.";
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
