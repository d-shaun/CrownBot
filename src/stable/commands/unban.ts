import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import search_user from "../../misc/search_user";

class BanCommand extends Command {
  constructor() {
    super({
      name: "unban",
      description: "Unban a banned user.",
      usage: ["unban <@user>", "unban <username>"],
      examples: ["unban @shaun", "unban shaun"],
      aliases: ["ubn"],
      required_permissions: ["MANAGE_MESSAGES"],
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });

    if (!message.member?.permissions.has("BAN_MEMBERS")) {
      response.text =
        "You do not have the permission (``BAN_MEMBERS``) to execute this command.";
      await response.send();

      return;
    }
    const mentioned = message.mentions.members?.first();
    let user = mentioned ? mentioned.user : undefined;

    if (!user && args.length !== 0) {
      user = await search_user(message, args);
    }

    if (!user) {
      response.text =
        "User not found; try mentioning the user instead (`@username`).";
      await response.send();
      return;
    }
    const banned_user = await bot.models.bans.findOne({
      guildID: message.guild.id,
      userID: user.id,
    });
    if (!banned_user) {
      response.text = `\`${user.tag}\` isn't banned in this guild.`;
      await response.send();
      return;
    }

    if (await banned_user.remove()) {
      response.text = `\`${user.tag}\` has been unbanned.`;
    } else {
      response.text = new Template(bot, message).get("exception");
    }

    await response.send();
  }
}

export default BanCommand;
