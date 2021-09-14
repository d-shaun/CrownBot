import { MessageReaction, User as DiscordUser } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import User from "../../handlers/LastFM_components/User";
import cb from "../../misc/codeblock";
class LoginCommand extends Command {
  constructor() {
    super({
      name: "login",
      description:
        "Logs user into the bot―linking their Discord and LastFM account in the database.",
      usage: ["login <lastfm username>"],
      aliases: [],
      category: "setup",
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const prefix = bot.cache.prefix.get(message.guild);
    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(bot.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);

    if (args.length === 0) {
      response.text =
        `please provide your Last.fm username along with the login command; ` +
        `see ${cb("help login", prefix)}.`;
      await response.send();
      return;
    }

    const username = args.join();
    const escapeRegex = (str: string) => {
      return str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    };
    const RE = new RegExp("^" + escapeRegex(username) + "$", "i");
    const existing_crowns = await bot.models.crowns.find({
      guildID: message.guild.id,
      userID: message.author.id,
      lastfm_username: { $not: RE },
    });

    if (existing_crowns.length) {
      const msg = await new BotMessage({
        bot,
        message,
        text: `You have **${existing_crowns.length}** crowns registered under another Last.fm username.\nChanging your username will **delete** those crowns in this server. Continue?`,
        reply: true,
      }).send();
      await msg.react("✅");
      const filter = (reaction: MessageReaction, user: DiscordUser) => {
        return reaction.emoji.name === "✅" && user.id === message.author.id;
      };

      const reactions = await msg.awaitReactions({
        filter,
        time: 3000,
        max: 1,
      });
      const message_exists = message.channel.messages.cache.get(msg.id);
      if (message_exists) msg.delete();
      if (reactions.size > 0) {
        const delete_stats = await bot.models.crowns.deleteMany({
          userID: message.author.id,
          guildID: message.guild.id,
          lastfm_username: { $not: RE },
        });
        response.text = `Your **${delete_stats.deletedCount}** crowns registered under another username in this server have been deleted.`;
        await response.send();
      } else {
        response.text = "Reaction wasn't clicked; no changes are made.";
        await response.send();
        return;
      }
    }

    await db.unsnap(message.guild.id, message.author.id);
    if (user) {
      await db.remove_user(message.guild.id, message.author.id);
    }

    const lastfm_user = await new User({ username }).get_info();
    if (lastfm_user.lastfm_errorcode || !lastfm_user.success) {
      response.error("lastfm_error", lastfm_user.lastfm_errormessage);
      // return;
    }

    if (await db.add_user(message.guild.id, message.author.id, username)) {
      response.text = `Username ${cb(
        username
      )} has been associated to your Discord account.`;
    } else {
      response.text = new Template(bot, message).get("exception");
    }
    await response.send();
  }
}

export default LoginCommand;
