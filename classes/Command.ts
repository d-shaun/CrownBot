import { Message, TextChannel } from "discord.js";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import check_ban from "../misc/check_ban";

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
  beta?: boolean;
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
    this.beta = options.beta;
  }

  async execute(client: CrownBot, message: Message, args: string[]) {
    const db = new DB(client.models);
    const response = new BotMessage({ client, message, text: "", reply: true });

    if (this.owner_only && message.author.id !== client.owner_ID) {
      return;
    }

    if (this.beta) {
      if (!(await db.check_optin(message))) {
        return;
      }
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
      const user = await db.fetch_user(message.author.id);
      if (!user) {
        response.text = `You must be logged into the bot to use this command.`;
        await response.send();
        return;
      }
    }

    if (!this.run) throw `${this.name} doesn't have a run function.`;
    try {
      await this.run(client, message, args);
      await this.log(client, message);
    } catch (e) {
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
    args: String[]
  ): Promise<void> {}
}
