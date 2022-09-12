import { User as DiscordUser } from "discord.js";
import moment from "moment";
import { Model } from "mongoose";
import { GuildMessage } from "../classes/Command";
import { UserTopArtist } from "../interfaces/ArtistInterface";
import { DBUser } from "../interfaces/DBUserInterface";
import { LeaderboardInterface } from "../interfaces/LeaderboardInterface";
import { ServerConfigInterface } from "../stable/models/ServerConfig";
import { SnapLogInterface } from "../stable/models/SnapLog";

export default class DB {
  #models: { [key: string]: Model<any> };

  /**
   *
   * @param models
   * The object made of mongoose models.
   * In this setup, it is `client.models`.
   */
  constructor(models: { [key: string]: Model<any> }) {
    this.#models = models;
  }

  /**
   * Adds a new user to the database.
   * @param guild_ID
   * @param user_ID
   * Discord user ID.
   *
   * @param username
   * Last.fm username.
   */
  async add_user(
    guild_ID: string | undefined,
    user_ID: string,
    username: string
  ): Promise<DBUser> {
    if (!guild_ID) throw "Guild ID not specified";
    return await this.#models.serverusers.create({
      guildID: guild_ID,
      userID: user_ID,
      username,
    });
  }

  /**
   * Fetches a user from the database.
   * @param guild_ID
   * @param user_ID
   * Discord user ID
   * @param global
   * If set to `true`, the user is searched globally instead of searching by the
   * provided `guild_ID`. (Default: `false`)
   */
  async fetch_user(
    guild_ID: string | undefined,
    user_ID: string,
    global = false
  ): Promise<DBUser | undefined> {
    let user;
    if (global) {
      user = await this.#models.serverusers.findOne({
        userID: user_ID,
      });
    } else {
      user = await this.#models.serverusers.findOne({
        guildID: guild_ID,
        userID: user_ID,
      });
    }
    return user;
  }

  /**
   * Legacy method of fetching user. This is similar to `fetch_user` with `global` set to `true`.
   *
   * - THIS WILL BE SOON REMOVED. REFER TO <https://discord.com/channels/657915913567469588/663355060058718228/747164031248367731>.
   *
   * @param user_ID
   * Discord user ID.
   */
  async legacy_fetch_user(user_ID: string): Promise<DBUser | undefined> {
    const user = await this.#models.users.findOne({
      userID: user_ID,
    });
    return user;
  }

  /**
   * Removes a user from the database.
   * @param guild_ID
   * @param user_ID
   * @param global
   * If set to `true`, the user is removed globally instead of from the specified `guild_ID`.
   */
  async remove_user(
    guild_ID: string | undefined,
    user_ID: string,
    global = false
  ): Promise<boolean> {
    if (global) {
      return !!(await this.#models.serverusers.deleteMany({ userID: user_ID }, {
        useFindAndModify: false,
      } as any));
    } else {
      return !!(await this.#models.serverusers.deleteMany(
        { guildID: guild_ID, userID: user_ID },
        {
          useFindAndModify: false,
        } as any
      ));
    }
  }

  /**
   * Adds a ban entry for a user.
   * @param message
   * The discord.js `message` object.
   *
   * @param user
   * The `DiscordUser` object.
   *
   */
  async ban_user(message: GuildMessage, user: DiscordUser): Promise<boolean> {
    return this.#models.bans.create({
      guildID: message.guild.id,
      guildName: message.guild.name,
      userID: user.id,
      username: user.tag,
      executor: `${message.author.tag} (${message.author.id})`,
    });
  }

  /**
   * Delete a crown of a user
   * @param artistName
   * @param guildID
   */
  async delete_crown(artistName: string, guildID?: string) {
    if (!guildID) return;
    return this.#models.crowns.deleteOne({
      artistName,
      guildID,
    });
  }

  /**
   * Updates crown for an artist in a server.
   * @param top
   */
  async update_crown(top: LeaderboardInterface) {
    return this.#models.crowns.findOneAndUpdate(
      {
        artistName: top.artist_name,
        guildID: top.guild_id,
      },
      {
        guildID: top.guild_id,
        userID: top.user_id,
        userTag: top.user_tag,
        lastfm_username: top.lastfm_username,
        artistName: top.artist_name,
        artistPlays: top.userplaycount,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
  }

  /**
   * Logs &whoplays stats of a server
   * @param track_name
   * @param artist_name
   * @param leaderboard
   * @param guild_id
   */
  async log_whoplays(
    track_name: string,
    artist_name: string,
    leaderboard: LeaderboardInterface[],
    guild_id: string
  ) {
    const timestamp = moment.utc().valueOf();
    return this.#models.whoplayslog.findOneAndUpdate(
      {
        track_name,
        artist_name,
        guild_id,
      },
      {
        track_name,
        artist_name,
        guild_id,
        listener: leaderboard.length,
        stat: leaderboard,
        timestamp,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
  }

  /**
   * Logs &whoknows stats of a server.
   * @param artist_name
   * @param leaderboard
   * @param guild_id
   */
  async log_whoknows(
    artist_name: string,
    leaderboard: LeaderboardInterface[],
    guild_id: string
  ) {
    const timestamp = moment.utc().valueOf();

    return this.#models.whoknowslog.findOneAndUpdate(
      {
        artist_name,
        guild_id,
      },
      {
        artist_name,
        guild_id,
        listener: leaderboard.length,
        stat: leaderboard,
        timestamp,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
  }

  /**
   * Logs `&list artist alltime` stats of a user in a server.
   * @param stat
   * @param user_id
   * @param guild_id
   */
  async log_list_artist(
    stat: UserTopArtist["topartists"]["artist"],
    user_id: string,
    guild_id: string
  ) {
    const timestamp = moment.utc().valueOf();
    return this.#models.listartistlog.findOneAndUpdate(
      {
        user_id,
        guild_id,
      },
      {
        user_id,
        guild_id,
        stat,
        timestamp,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
  }

  /**
   * Opts a server out of beta features.
   * @param message
   */
  async opt_out(message: GuildMessage): Promise<void> {
    await this.#models.optins.findOneAndRemove(
      {
        type: "beta",
        guild_ID: message.guild.id,
      },
      {
        useFindAndModify: false,
      }
    );
  }

  /**
   * Opts a server in to beta features.
   * @param message
   */
  async opt_in(message: GuildMessage): Promise<void> {
    await this.#models.optins.findOneAndUpdate(
      {
        type: "beta",
        guild_ID: message.guild.id,
      },
      {
        type: "beta",
        guild_ID: message.guild.id,
        guild_name: message.guild.name,
        username: message.author.tag,
        user_ID: message.author.id,
        timestamp: `${new Date().toUTCString()}`,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
  }

  /**
   * Checks current opt-in status of a server.
   * @param message
   */
  async check_optin(message: GuildMessage): Promise<boolean> {
    const beta_log = await this.#models.optins
      .findOne({
        type: "beta",
        guild_ID: message.guild.id,
      })
      .lean();
    return !!beta_log;
  }

  /**
   * Fetches configurations of a server.
   * - Returns an object with `min_plays_for_crowns` set to 1 if no config is found.
   * @param message
   */
  async server_config(message: GuildMessage) {
    const server_config: ServerConfigInterface | null =
      await this.#models.serverconfig.findOne({
        guild_ID: message.guild.id,
      });
    if (!server_config) {
      return new this.#models.serverconfig({
        guild_ID: message.guild.id,
        min_plays_for_crowns: 1,
      });
    }
    return server_config;
  }

  /// TEMPORARY HELPER FUNCTIONS FOR &eval command snap AND WHATEVER IT AFFECTS
  // (https://discord.com/channels/657915913567469588/663355060058718228/879388787489276034)

  async find_multiple_usernames(): Promise<SnapLogInterface[]> {
    return await this.#models.crowns.aggregate([
      {
        $group: {
          _id: { userID: "$userID", guildID: "$guildID" },
          usernames: { $addToSet: "$lastfm_username" },
        },
      },
      {
        $project: {
          _id: 0,
          userID: "$_id.userID",
          guildID: "$_id.guildID",
          username_count: {
            $size: "$usernames",
          },
        },
      },
      {
        $match: {
          username_count: {
            $gt: 1,
          },
        },
      },
    ]);
  }

  async check_snap(guildID: string, userID: string) {
    const snap_log = await this.#models.snaplog.findOne({ userID, guildID });
    return !!snap_log;
  }

  async snap(guildID: string, userID: string) {
    return await this.#models.snaplog.findOneAndUpdate(
      {
        userID,
        guildID,
      },
      {
        userID,
        guildID,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
  }

  async unsnap(guildID: string, userID: string) {
    return await this.#models.snaplog.deleteMany({
      userID,
      guildID,
    });
  }
}
