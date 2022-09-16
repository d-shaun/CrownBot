import { REST, Routes } from "discord.js";
import fs from "fs";
import { connect, model, Model, Mongoose } from "mongoose";
import path from "path";
import { BotConfigInterface } from "../stable/models/BotConfig";
import { ServerConfigInterface } from "../stable/models/ServerConfig";
import CacheHandler from "./Cache";

//TODO: REMOVE ABANDONDED METHODS FROM HERE 

export default class CrownBot {
  version: string;
  prefix: string;
  buttons_version: string;
  max_users: number;
  
  cache = new CacheHandler(this);
  #token: string;
  owner_ID: string;
  api_key: string;
  access_token: string;
  genius_api?: string;
  mongo: string;
  mongoose: Mongoose | undefined;

  url: string;
  server_configs: ServerConfigInterface[] | undefined = undefined;
  commands: any[] = [];
  models: { [key: string]: Model<any> } = {};
  botconfig: BotConfigInterface | undefined;

  constructor(options: any) {
    this.version = options.version;
    this.#token = options.token;
    this.prefix = options.prefix;
    this.buttons_version = options.buttons_version;
    this.max_users = options.max_users || 200;

    this.owner_ID = options.owner_ID;
    this.api_key = options.api_key;
    this.access_token = options.access_token;
    this.genius_api = options.genius_api;
    this.mongo = options.mongo;

    this.url = options.url;
  }

  async init_dev() {
    await this.load_commands();
    return this;
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
  // async init_stable() {
  //   await this.load_db();
  //   if (!this.mongoose) throw "welp";
  //   this.load_commands().load_models();

  //   await this.load_botconfig();
  //   await this.cache.prefix.init(); /* cache server prefixes for the session */
  //   await this.cache.config.init(); /* cache server configs for the session */
  //   return this;
  // }

  /**
   * Connects to MongoDB.
   */
  async load_db() {
    this.mongoose = await connect(this.mongo, {}).catch((e) => {
      console.log(e);
      return e;
    });
  }

  async load_commands() {
    const commands = [];
    const dir: string = path.join(__dirname, "../stable/commands");

    const commandFiles = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".js"));

    // Place your client and guild ids here
    const clientId = "636794173378265089";
    const guildId = "414155200862093312";

    for (const file of commandFiles) {
      const command = require(path.join(dir, file));

      commands.push(command.data.toJSON());
    }
    const rest = new REST({ version: "10" }).setToken(this.#token);

    return (async () => {
      try {
        console.log(
          `Started refreshing ${commands.length} application (/) commands.`
        );

        const data: any = await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands }
        );
        this.commands = commands;

        console.log(
          `Successfully reloaded ${data.length} application (/) commands.`
        );
      } catch (error) {
        console.error(error);
      }
    })();
  }

  /**
   * Registers all commands from `../stable/commands/` and `../beta/commands/`
   * to `client.commands` and `client.beta_commands` respectively.
   */
  // load_commands_old() {
  //   const register_commands = (location: string, beta = false) => {
  //     const dir: string = path.join(__dirname, location);
  //     if (!fs.existsSync(dir)) {
  //       return;
  //     }
  //     const commands: string[] = fs.readdirSync(dir);
  //     commands.forEach((file: string) => {
  //       if (file.endsWith(".js")) {
  //         const Command = require(path.join(dir, file)).default;
  //         const command = new Command();
  //         if (beta) {
  //           command.beta = true;
  //           this.beta_commands.push(command);
  //         } else {
  //           this.commands.push(command);
  //         }
  //       }
  //     });
  //   };

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

  /**
   * Fetches and stores the BotConfig model
   */
  async load_botconfig() {
    this.botconfig = await this.models.botconfig.findOne().lean();
    return this;
  }
}
