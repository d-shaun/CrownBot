import { Message } from "discord.js";
import fs from "fs";
import { model } from "mongoose";
import path from "path";
import CrownBotClass from "../classes/CrownBot";
import { ServerConfigInterface } from "../models/ServerConfig";
class CrownBot extends CrownBotClass {
  async init() {
    await super.load_db();
    this.load_commands().load_events().load_models();
    await super.log_in();
    return this;
  }

  load_commands() {
    const dir: string = path.join(__dirname, "../commands");
    const commands: string[] = fs.readdirSync(dir);
    commands.forEach((file: string) => {
      if (file.endsWith(".js")) {
        const Command: any = require(path.join(dir, file)).default;
        const command = new Command();
        this.commands.push(command);
      }
    });
    return this;
  }

  load_events() {
    const dir: string = path.join(__dirname, "../events");
    const events: string[] = fs.readdirSync(dir);
    events.forEach((file: string) => {
      const [eventName]: string[] = file.split(".");
      const props = require(path.join(dir, file));
      // @ts-ignore
      this.on(eventName, props.default.bind(null, this));
    });
    return this;
  }

  load_models() {
    const dir: string = path.join(__dirname, "../models");
    const models: string[] = fs.readdirSync(dir);
    models.forEach((file) => {
      const [model_name] = file.split(".");
      const schema = require(path.join(dir, file)).default(this.mongoose);
      this.models[model_name.toLowerCase()] = model(model_name, schema);
    });
  }

  async cache_prefixes() {
    interface PrefixInterface {
      _id: string;
      guildID: string;
      guildName: string;
      prefix: string;
    }
    const prefixes = await this.models.prefixes.find();
    this.prefixes = {};
    prefixes.forEach((prefix: PrefixInterface) => {
      if (this.prefixes) {
        this.prefixes[prefix.guildID] = prefix.prefix;
      }
    });
    console.log(`initialized ${prefixes.length} prefix(es)`);
  }

  get_cached_prefix(message: Message): string {
    if (message.guild?.id) {
      if (this.prefixes && this.prefixes[message.guild.id]) {
        return this.prefixes[message.guild.id];
      } else {
        return "&";
      }
    }
    throw "No guild ID found to fetch prefixes of; probably running in DM?";
  }

  async cache_configs() {
    const configs: ServerConfigInterface[] = await this.models.serverconfig.find();
    this.server_configs = configs;
    console.log(`initialized ${configs.length} server config(s)`);
  }

  get_cached_config(message: Message): ServerConfigInterface | undefined {
    const config = this.server_configs?.find(
      (config) => config.guild_ID === message.guild?.id
    );
    if (config) return config;
    return undefined;
  }
}

export default CrownBot;
