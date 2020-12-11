import { Guild, Message, PermissionString } from "discord.js";
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

  async execute(
    client: CrownBot,
    message: GuildMessage,
    args: string[],
    override_beta = false
  ) {
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
        response.text = "You are banned from accessing the bot in this guild.";
        await response.send();
        return;
      }
    }

    if (this.require_login) {
      const user = await db.fetch_user(message.guild?.id, message.author.id);
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
      await this.run(client, message, args);
      message.channel.stopTyping(true);

      await this.log_command(client, message);
    } catch (e) {
      message.channel.stopTyping(true);
      console.error(e);
      await this.log_error(client, message, e.stack || e);
    }
  }

  async log_command(client: CrownBot, message: GuildMessage) {
    if (!message.guild) return;
    var expire_date = new Date();
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

    if (!message.guild) return;
    var expire_date = new Date();
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
      // await response.send();
    }
  }

  async run(
    client: CrownBot,
    message: Message,
    args: string[]
  ): Promise<void> {}
}
