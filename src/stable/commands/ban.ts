import { Message, MessageReaction, User } from "discord.js";
import Command from "../../classes/Command";
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
        "Ban a user from accessing the bot and showing up on the 'whoknows' list.",
      usage: ["ban <@user>"],
      aliases: ["bn"],
      examples: ["ban @shaun", "ban shaun"],
      required_permissions: ["MANAGE_MESSAGES"],
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const db = new DB(client.models);

    if (!message.guild) return;
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });

    if (!message.member?.hasPermission("BAN_MEMBERS")) {
      response.text =
        "You do not have the permission (``BAN_MEMBERS``) to execute this command.";
      await response.send();

      return;
    }
    let mentioned = message.mentions.members?.first();
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
    const banned_user = await client.models.bans.findOne({
      guildID: message.guild.id,
      userID: user.id,
    });
    if (banned_user) {
      response.text =
        `\`${user.tag}\` has already been banned in this guild; ` +
        `looking for the ${cb("unban", server_prefix)} command, maybe?`;
      await response.send();
      return;
    }
    const msg = await message.reply(
      "Are you sure you want to ban `" +
        user.tag +
        "`? This will ban them from accessing the bot and showing up on the 'whoknows' list. " +
        "Click the reaction to continue."
    );

    await msg.react("✅");

    const reactions = await msg.awaitReactions(
      (reaction: MessageReaction, user: User) => {
        return reaction.emoji.name === "✅" && user.id === message.author.id;
      },
      {
        max: 1,
        time: 30000,
      }
    );

    if (reactions.size > 0) {
      if (await db.ban_user(message, user)) {
        await msg.edit(
          `\`${user.tag}\` has been banned from accessing the bot and showing up on the 'whoknows' list.`
        );
      } else {
        await msg.edit(new Template(client, message).get("exception"));
      }
    } else {
      await msg.edit("Reaction wasn't clicked; no changes are made.");
    }
    await msg.reactions.removeAll();
  }
}

export default BanCommand;
