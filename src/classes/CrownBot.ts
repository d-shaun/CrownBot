import { Client } from "discord.js";
import { connect, Model } from "mongoose";
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

interface PrefixInterface {
  _id?: string;
  guildID?: string;
  guildName?: string;
  prefix?: string;
  [key: string]: any;
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
  mongoose: any;
  genius_api?: string;

  constructor(options: OptionInterface) {
    super();
    this.prefix = options.prefix;
    this.#token = options.token;
    this.owner_ID = options.owner_ID;
    this.access_token = options.access_token;
    this.#mongo = options.mongo;
    this.genius_api = options.genius_api;
  }

  async log_in() {
    const that = this;
    this.login(this.#token).then(() => {
      console.log(`Logged in as ${that.user?.tag}`);
    });
  }

  async load_db() {
    // mongoose db
    this.mongoose = await connect(this.#mongo, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).catch((e) => {
      console.log(e);
    });
  }
}

export default CrownBotClass;
