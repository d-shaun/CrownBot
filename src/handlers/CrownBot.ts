import fs from "fs";
import { connect, model, Model, Mongoose } from "mongoose";
import path from "path";
import Command from "../classes/Command";
import { ServerConfigInterface } from "../stable/models/ServerConfig";
import CacheHandler from "./Cache";

export default class CrownBot {
  version: string;
  prefix: string;
  buttons_version: string;

  cache = new CacheHandler(this);
  owner_ID: string;
  api_key: string;
  access_token?: string;
  genius_api?: string;
  mongo: string;
  mongoose: Mongoose | undefined;

  url: string;

  server_configs: ServerConfigInterface[] | undefined = undefined;
  commands: Command[] = [];
  beta_commands: Command[] = [];
  models: { [key: string]: Model<any> } = {};

  constructor(options: any) {
    this.version = options.version;
    this.prefix = options.prefix;
    this.buttons_version = options.version;

    this.owner_ID = options.owner_ID;
    this.api_key = options.api_key;
    this.access_token = options.access_token;
    this.genius_api = options.genius_api;
    this.mongo = options.mongo;

    this.url = options.url;
  }

  /**
   * - Connects to MongoDB.
   * - Loads commands.
   * - Adds event hooks.
   * - Registers models.
   * - Initializes prefixes.
   * - Initializes server-specific configurations.
   * - Finally, logs the bot in.
   */
  async init() {
    await this.load_db();
    if (!this.mongoose) throw "welp";
    this.load_commands().load_models();
    await this.cache.prefix.init(); /* cache server prefixes for the session */
    await this.cache.config.init(); /* cache server configs for the session */
    return this;
  }

  /**
   * Connects to MongoDB.
   */
  async load_db() {
    this.mongoose = await connect(this.mongo, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).catch((e) => {
      console.log(e);
      return e;
    });
  }

  /**
   * Registers all commands from `../stable/commands/` and `../beta/commands/`
   * to `client.commands` and `client.beta_commands` respectively.
   */
  load_commands() {
    const register_commands = (location: string, beta = false) => {
      const dir: string = path.join(__dirname, location);
      if (!fs.existsSync(dir)) {
        return;
      }
      const commands: string[] = fs.readdirSync(dir);
      commands.forEach((file: string) => {
        if (file.endsWith(".js")) {
          const Command = require(path.join(dir, file)).default;
          const command = new Command();
          if (beta) {
            command.beta = true;
            this.beta_commands.push(command);
          } else {
            this.commands.push(command);
          }
        }
      });
    };

    register_commands("../stable/commands");
    register_commands("../beta/commands", true);

    return this;
  }

  /**
   * Loads mongoose models from `../stable/models` to `client.models[modelname]`.
   */
  load_models() {
    const dir: string = path.join(__dirname, "../stable/models");
    const models: string[] = fs.readdirSync(dir);
    models.forEach((file) => {
      const [model_name] = file.split(".");
      const schema = require(path.join(dir, file)).default(this.mongoose);
      this.models[model_name.toLowerCase()] = model(model_name, schema);
    });
  }
}
