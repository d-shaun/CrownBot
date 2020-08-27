import { Message, TextChannel, PermissionString } from "discord.js";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import check_ban from "../misc/check_ban";
import cb from "../misc/codeblock";
import { Template } from "./Template";

interface CommandInterface {
  name: string;
  description: string;
  usage: string[];
  aliases: string[];
  hidden?: boolean;
  owner_only?: boolean;
  examples?: string[];
  allow_banned?: boolean;
  require_login?: boolean;
  required_permissions?: string[];
}

export default class Command {
  name: string;
  description: string;
  usage: string[];
  aliases: string[];
  hidden?: boolean;
  owner_only?: boolean;
  examples?: string[];
  allow_banned?: boolean;
  require_login?: boolean;
  required_permissions?: string[];
  beta?: boolean;

  constructor(options: CommandInterface) {
    this.name = options.name;
    this.description = options.description;
    this.usage = options.usage || [];
    this.aliases = options.aliases || [];
    this.hidden = options.hidden;
    this.owner_only = options.owner_only;
    this.examples = options.examples;
    this.allow_banned = options.allow_banned;
    this.require_login = options.require_login;
    this.required_permissions = options.required_permissions;
  }

  async execute(
    client: CrownBot,
    message: Message,
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

      await this.log(client, message);
    } catch (e) {
      message.channel.stopTyping(true);
      console.error(e);
      await this.log(client, message, e.stack);
    }
  }

  async log(client: CrownBot, message: Message, stack?: string) {
    if (!message.guild) return;
    const data = {
      command_name: this.name,
      message_id: message.id,
      message_content: message.content,
      username: message.author.tag,
      user_ID: message.author.id,
      guild_name: message.guild.name,
      guild_ID: message.guild.id,
      channel_name: (<TextChannel>message.channel).name,
      channel_ID: message.channel.id,
      timestamp: `${new Date().toUTCString()}`,
      stack: `${stack || `none`}`,
    };
    await new client.models.logs({ ...data }).save();
    if (stack) {
      await new client.models.errorlogs({ ...data }).save();
    }
  }

  async run(
    client: CrownBot,
    message: Message,
    args: string[]
  ): Promise<void> {}
}
