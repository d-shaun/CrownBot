import { Client } from "discord.js";
import { connect, Model, Mongoose } from "mongoose";
import { ServerConfigInterface } from "../stable/models/ServerConfig";
import Command from "./Command";

interface OptionInterface {
  prefix: string;
  token: string;
  owner_ID: string;
  api_key: string;
  access_token?: string;
  mongo: string;
  genius_api?: string;
  url?: string;
}

class CrownBotClass extends Client {
  prefix: string;
  server_configs: ServerConfigInterface[] | undefined = undefined;
  owner_ID: string;
  #token: string;
  access_token?: string;
  #mongo: string;
  url = "https://ws.audioscrobbler.com/2.0/?";
  commands: Command[] = [];
  beta_commands: Command[] = [];
  models: { [key: string]: Model<any> } = {};
  mongoose: Mongoose | undefined;
  genius_api?: string;

  options = {
    messageCacheMaxSize: 20,
    messageEditHistoryMaxSize: 0,
  };

  constructor(options: OptionInterface) {
    super();
    this.prefix = options.prefix;
    this.#token = options.token;
    this.owner_ID = options.owner_ID;
    this.access_token = options.access_token;
    this.#mongo = options.mongo;
    this.genius_api = options.genius_api;
  }

  /**
   * Logs the bot user into Discord.
   */
  async log_in() {
    this.login(this.#token).then(() => {
      console.log(`Logged in as ${this.user?.tag}`);
    });
  }

  /**
   * Connects to MongoDB.
   */
  async load_db() {
    this.mongoose = await connect(this.#mongo, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).catch((e) => {
      console.log(e);
      return e;
    });
  }
}

export default CrownBotClass;
