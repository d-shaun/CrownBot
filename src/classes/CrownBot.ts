import { Client } from "discord.js";
import { connect, Model } from "mongoose";
import Command from "./Command";
interface OptionInterface {
  prefix: string;
  token: string;
  owner_ID: string;
  api_key: string;
  access_token?: string;
  mongo: string;
  prefixes?: {};
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
  prefixes: PrefixInterface | undefined = undefined;
  owner_ID: string;
  #token: string;
  #api_key: string;
  access_token?: string;
  #mongo: string;
  url = "https://ws.audioscrobbler.com/2.0/?";
  commands: Command[] = [];
  models: { [key: string]: Model<any> } = {};

  mongoose: any;

  constructor(options: OptionInterface) {
    super();
    this.prefix = options.prefix;
    this.#token = options.token;
    this.owner_ID = options.owner_ID;
    this.#api_key = options.api_key;
    this.access_token = options.access_token;
    this.#mongo = options.mongo;
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
