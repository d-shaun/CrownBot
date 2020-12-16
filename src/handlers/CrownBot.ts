import fs from "fs";
import { model } from "mongoose";
import path from "path";
import CrownBotClass from "../classes/CrownBot";
import CacheHandler from "./Cache";
class CrownBot extends CrownBotClass {
  cache = new CacheHandler(this);

  async init() {
    await super.load_db();
    this.load_commands().load_events().load_models();
    await this.cache.prefix.init(); /* cache server prefixes for the session */
    await this.cache.config.init(); /* cache server configs for the session */
    await super.log_in();
    return this;
  }

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

  load_events() {
    const dir: string = path.join(__dirname, "../events");
    const events: string[] = fs.readdirSync(dir);
    events.forEach((file: string) => {
      const [eventName]: string[] = file.split(".");
      const props = require(path.join(dir, file));
      this.on(eventName, props.default.bind(null, this));
    });
    return this;
  }

  load_models() {
    const dir: string = path.join(__dirname, "../stable/models");
    const models: string[] = fs.readdirSync(dir);
    models.forEach((file) => {
      const [model_name] = file.split(".");
      const schema = require(path.join(dir, file)).default(this.mongoose);
      this.models[model_name.toLowerCase()] = model(model_name, schema);
    });
  }

  // async cache_configs() {
  //   const configs: ServerConfigInterface[] = await this.models.serverconfig.find();
  //   this.server_configs = configs;
  //   console.log(`initialized ${configs.length} server config(s)`);
  // }

  // get_cached_config(message: GuildMessage): ServerConfigInterface | undefined {
  //   const config = this.server_configs?.find(
  //     (config) => config.guild_ID === message.guild.id
  //   );
  //   if (config) return config;
  //   return undefined;
  // }
}

export default CrownBot;
