import { REST, Routes } from "discord.js";
import fs from "fs";
import { connect, Mongoose } from "mongoose";
import path from "path";
import { generate_models, ModelTypes } from "../models/DBModels";
import CacheHandler from "./Cache";
import Logger from "./Logger";

type Options = {
  version: string;
  buttons_version: string;
  max_users: number;
  client_id: string;
  token: string;
  owner_ID: string;
  api_key: string;
  access_token: string;
  genius_api?: string;
  mongo: string;
  url: string;
};

export default class CrownBot {
  version: string;
  buttons_version: string;
  max_users: number;

  cache = new CacheHandler(this);
  logger = new Logger(this);

  client_id: string;
  #token: string;
  owner_ID: string;
  api_key: string;
  access_token: string;
  genius_api?: string;
  mongo: string;
  mongoose: Mongoose | undefined;

  url: string;
  server_configs: ModelTypes["ServerConfig"] | undefined;
  commands: any[] = [];
  //@ts-ignore: app throws exception error if there are no models anyway
  models: ModelTypes;
  botconfig: ModelTypes["BotConfig"] | undefined;

  constructor(options: Options) {
    this.version = options.version;
    this.#token = options.token;
    this.buttons_version = options.buttons_version;
    this.max_users = options.max_users || 200;

    this.client_id = options.client_id;
    this.owner_ID = options.owner_ID;
    this.api_key = options.api_key;
    this.access_token = options.access_token;
    this.genius_api = options.genius_api;
    this.mongo = options.mongo;

    this.url = options.url;
  }

  /**
   * - Connects to MongoDB.
   * - Registers slash commands.
   * - Registers models.
   * - Initializes server-specific configurations.
   * - Finally, logs the bot in.
   */

  async init() {
    await this.load_db();
    await this.register_commands();
    await this.load_botconfig();
    await this.cache.config.init(); /* cache server configs for the session */
    if (!this.commands.length || !this.mongoose || !this.models)
      throw "Failed initializing mongoose and/or commands. (never really happens tho)";
    return this;
  }

  /**
   * Connects to MongoDB.
   */
  async load_db() {
    this.mongoose = await connect(this.mongo, {}).catch((e) => {
      console.log(e);
      return e;
    });
    const gen_models = generate_models(this.mongoose);
    if (!gen_models) throw "Could not generate models.";
    this.models = gen_models;
  }

  /**
   * Registers slash commands
   */
  async register_commands() {
    const commands = [];
    const dir: string = path.join(__dirname, "../commands");

    const commandFiles = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".js"));

    const clientId = this.client_id;
    for (const file of commandFiles) {
      const command = require(path.join(dir, file));
      this.commands.push(command);
      commands.push(command.data.toJSON());
    }
    const rest = new REST({ version: "10" }).setToken(this.#token);

    return (async () => {
      try {
        console.log(
          `Started refreshing ${commands.length} application (/) commands.`
        );

        await rest.put(Routes.applicationCommands(clientId), {
          body: commands,
        });
      } catch (error) {
        console.error(error);
      }
    })();
  }

  /**
   * Fetches and stores the BotConfig model
   */
  async load_botconfig() {
    this.botconfig = await this.models?.BotConfig.findOne().lean();
    return this;
  }
}
