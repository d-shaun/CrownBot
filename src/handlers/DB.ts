import { Message, User as DiscordUser } from "discord.js";
import moment from "moment";
import { Model } from "mongoose";
import User from "../classes/User";
import { LeaderboardInterface } from "../interfaces/LeaderboardInterface";
import { ServerConfigInterface } from "../models/ServerConfig";

export default class DB {
  #models: { [key: string]: Model<any> };
  constructor(models: { [key: string]: Model<any> }) {
    this.#models = models;
  }

  async add_user(
    guild_ID: string | undefined,
    user_ID: string,
    username: string
  ): Promise<User> {
    if (!guild_ID) throw "Guild ID not specified";
    return await this.#models.serverusers.create({
      guildID: guild_ID,
      userID: user_ID,
      username,
    });
  }

  async fetch_user(
    guild_ID: string | undefined,
    user_ID: string
  ): Promise<User | undefined> {
    const user = await this.#models.serverusers.findOne({
      guildID: guild_ID,
      userID: user_ID,
    });
    return user;
  }

  async remove_user(
    guild_ID: string | undefined,
    user_ID: string
  ): Promise<boolean> {
    // TODO: "global" option
    return !!(await this.#models.serverusers.findOneAndRemove(
      { guildID: guild_ID, userID: user_ID },
      {
        useFindAndModify: false,
      } as any
    ));
  }

  async ban_user(message: Message, user: DiscordUser): Promise<boolean> {
    if (!message.guild) return false;
    return this.#models.bans.create({
      guildID: message.guild.id,
      guildName: message.guild.name,
      userID: user.id,
      username: user.tag,
      executor: `${message.author.tag} (${message.author.id})`,
    });
  }

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
        // @ts-ignore
        useFindAndModify: false,
      }
    );
  }

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
        // @ts-ignore
        useFindAndModify: false,
      }
    );
  }

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
        // @ts-ignore
        useFindAndModify: false,
      }
    );
  }
  async opt_out(message: Message): Promise<void> {
    if (!message.guild) throw "Shut up, TypeScript.";
    await this.#models.optins.findOneAndRemove(
      {
        type: "beta",
        guild_ID: message.guild.id,
      },
      {
        // @ts-ignore
        useFindAndModify: false,
      }
    );
  }
  async opt_in(message: Message): Promise<void> {
    if (!message.guild) throw "Shut up, TypeScript.";
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
        // @ts-ignore
        useFindAndModify: false,
      }
    );
  }
  async check_optin(message: Message): Promise<boolean> {
    if (!message.guild) throw "Shut up, TypeScript.";
    const beta_log = await this.#models.optins
      .findOne({
        type: "beta",
        guild_ID: message.guild.id,
      })
      .lean();
    return !!beta_log;
  }

  async server_config(message: Message) {
    if (!message.guild) throw "Shut up, TypeScript.";
    const server_config: ServerConfigInterface = await this.#models.serverconfig.findOne(
      {
        guild_ID: message.guild.id,
      }
    );
    if (!server_config) {
      return new this.#models.serverconfig({
        guild_ID: message.guild.id,
        min_plays_for_crowns: 1,
      });
    }
    return server_config;
  }
}
