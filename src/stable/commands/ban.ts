import { MessageReaction, User } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import cb from "../../misc/codeblock";
import search_user from "../../misc/search_user";

class BanCommand extends Command {
  constructor() {
    super({
      name: "ban",
      description:
        "Bans a user from accessing the bot and showing up on the 'whoknows' list.",
      usage: ["ban <@user>"],
      aliases: ["bn"],
      examples: ["ban @shaun", "ban shaun"],
      required_permissions: ["MANAGE_MESSAGES"],
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = bot.cache.prefix.get(message.guild);
    const db = new DB(bot.models);

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
    if (banned_user) {
      response.text =
        `${cb(user.tag)} has already been banned in this guild; ` +
        `looking for the ${cb("unban", server_prefix)} command, maybe?`;
      await response.send();
      return;
    }
    const msg = await message.reply(
      "Are you sure you want to ban " +
        cb(user.tag) +
        "? This will ban them from accessing the bot and showing up on the 'whoknows' list. " +
        "Click the reaction to continue."
    );

    await msg.react("✅");

    const filter = (reaction: MessageReaction, user: User) => {
      return reaction.emoji.name === "✅" && user.id === message.author.id;
    };

    const reactions = await msg.awaitReactions({ filter, time: 30000, max: 1 });

    let response_text;
    if (reactions.size > 0) {
      if (await db.ban_user(message, user)) {
        response_text = `${cb(
          user.tag
        )} has been banned from accessing the bot and showing up on the 'whoknows' list.`;
      } else {
        response_text = new Template(bot, message).get("exception");
      }
    } else {
      response_text = "Reaction wasn't clicked; no changes are made.";
    }
    // check if message still exists
    const message_exists = message.channel.messages.cache.get(msg.id);
    if (message_exists) {
      await msg.reactions.removeAll();
      await msg.edit(response_text);
    } else {
      response.text = response_text;
      await response.send();
    }
  }
}

export default BanCommand;
