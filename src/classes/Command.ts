import {
  Guild,
  Message,
  MessageEmbed,
  PermissionString,
  TextChannel,
} from "discord.js";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import check_ban from "../misc/check_ban";
import cb from "../misc/codeblock";
import generate_random_strings from "../misc/generate_random_strings";
import { Template } from "./Template";

interface CommandInterface {
  name: string;
  description: string;
  usage: string[];
  aliases: string[];
  extra_aliases?: string[];
  hidden?: boolean;
  owner_only?: boolean;
  examples?: string[];
  allow_banned?: boolean;
  require_login?: boolean;
  required_permissions?: string[];
  beta?: boolean;
  category?: string;
}

export interface GuildMessage extends Message {
  guild: Guild;
}

export default class Command {
  name: string;
  description: string;
  usage: string[];
  aliases: string[];
  extra_aliases?: string[];
  hidden?: boolean;
  owner_only?: boolean;
  examples?: string[];
  allow_banned?: boolean;
  require_login?: boolean;
  required_permissions?: string[];
  beta?: boolean;
  category?: string;

  constructor(options: CommandInterface) {
    this.name = options.name;
    this.description = options.description;
    this.usage = options.usage || [];
    this.aliases = options.aliases || [];
    this.extra_aliases = options.extra_aliases || [];
    this.hidden = options.hidden;
    this.owner_only = options.owner_only;
    this.examples = options.examples;
    this.allow_banned = options.allow_banned;
    this.require_login = options.require_login;
    this.required_permissions = options.required_permissions;
    this.category = options.category;
  }

  /**
   * Runs a specific command with `client`, `message`, and `args` as arguments if
   * the following checks pass:
   * - if user is not banned (globally or locally)
   * - if user is logged in if `require_login` is set to true
   * - if bot has the essential permissions
   * @param client
   * @param message
   * @param args
   */
  async execute(client: CrownBot, message: GuildMessage, args: string[]) {
    const db = new DB(client.models);
    const response = new BotMessage({ client, message, text: "", reply: true });
    if (!message.guild || !message.guild.me) return;
    if (this.owner_only && message.author.id !== client.owner_ID) {
      return;
    }

    const ban_info = await check_ban(message, client);
    if (ban_info.banned && message.author.id !== client.owner_ID) {
      if (ban_info.type === "global" && !this.allow_banned) {
        response.text =
          "You are globally banned from accessing the bot; try `&about` to find the support server.";
        await response.send();
        return;
      }
      if (ban_info.type === "local") {
        if (this.name !== "unban") {
          response.text =
            "You are banned from accessing the bot in this guild.";
          await response.send();
          return;
        }
      }
    }

    if (this.require_login) {
      const user = await db.fetch_user(message.guild.id, message.author.id);
      if (!user) {
        response.text = new Template(client, message).get("not_logged");
        await response.send();
        return;
      }
    }
    let has_permissions = true;
    const lacking_permissions = [];
    if (this.required_permissions) {
      for (const permission of this.required_permissions) {
        if (!message.guild.me.hasPermission(<PermissionString>permission)) {
          has_permissions = false;
          lacking_permissions.push(permission);
        }
      }
    }

    if (!has_permissions) {
      response.text =
        `The bot needs to have the following permissions: ` +
        `${lacking_permissions.join(", ")}.`;
      await response.send();
      return;
    }

    if (!this.run) throw `${this.name} doesn't have a run function.`;
    message.channel.startTyping();
    try {
      const lowercase_args = args.map((arg) => arg.toLowerCase());
      await this.run(client, message, lowercase_args);
      message.channel.stopTyping(true);

      await this.log_command(client, message);
    } catch (e) {
      message.channel.stopTyping(true);
      console.error(e);
      await this.log_error(client, message, e.stack || e);
    }
  }

  async log_command(client: CrownBot, message: GuildMessage) {
    const expire_date = new Date();
    expire_date.setDate(expire_date.getDate() + 28); // add 28 days to current date
    const data = {
      expireAt: expire_date,
      command_name: this.name,
      message_content: message.content,
      user_ID: message.author.id,
      guild_ID: message.guild.id,
      username: message.author.tag,
      timestamp: `${new Date().toUTCString()}`,
    };
    await new client.models.logs({ ...data }).save();
  }

  async log_error(client: CrownBot, message: GuildMessage, stack?: string) {
    const response = new BotMessage({ client, message, text: "", reply: true });
    const server_prefix = client.cache.prefix.get(message.guild);

    const expire_date = new Date();
    expire_date.setDate(expire_date.getDate() + 28); // add 28 days to current date
    const incident_id = generate_random_strings(8);
    const data = {
      expireAt: expire_date,
      incident_id,
      command_name: this.name,
      message_content: message.content,
      user_ID: message.author.id,
      guild_ID: message.guild.id,
      timestamp: `${new Date().toUTCString()}`,
      stack: `${stack || `none`}`,
    };
    if (stack) {
      await new client.models.errorlogs({ ...data }).save();
      response.text =
        `The bot has encountered an unexpected error while executing your request; ` +
        `please consider reporting this incident (id: ${cb(
          incident_id
        )}) to the bot's support server—see ${cb("about", server_prefix)}.`;
      await response.send();
    }

    // attempt to send logs to the channel specified in "exception_log_channel" (/src/models/BotConfig.ts)
    try {
      await this.send_exception_log(client, incident_id, stack);
    } catch (e) {
      // supress any error to avoid infinite error loop

      console.error(
        "Supressed an exception to prevent a throw-catch loop; please check the relevant log below."
      );

      console.log(e);
    }
  }

  /**
   * Sends exception log to the channel specified in `config.exception_log_channel` along with
   * the incident ID and error stack.
   * @param client
   * @param incident_id
   * @param stack
   */
  async send_exception_log(
    client: CrownBot,
    incident_id: string,
    stack?: string
  ) {
    // check if exception_log_channel is set
    const config = await client.models.botconfig.findOne();
    if (!config || !config.exception_log_channel) return;

    const channel = <TextChannel | undefined>(
      client.channels.cache.get(config.exception_log_channel)
    );

    if (!channel) {
      console.log(
        "Cannot find the channel `" +
          config.exception_log_channel +
          "` set in exception_log_channel."
      );
      return;
    }

    const embed = new MessageEmbed()
      .setTitle("Uncaught exception")
      .addField("Incident ID", incident_id, false)
      .addField("Command name", this.name, true)
      .addField("Timestamp", new Date().toUTCString(), true);

    if (stack) {
      embed.addField("Error", "```JS\n" + stack.split("\n").shift() + "\n```");
    }
    await channel.send(embed);
  }

  async run(
    client: CrownBot,
    message: GuildMessage,
    args: string[]
  ): Promise<void> {
    // placeholder
    console.log(client, message, args);
    return;
  }
}
