import { MessageReaction, User } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import cb from "../../misc/codeblock";
import { CrownInterface } from "../models/Crowns";

class DeleteCrownCommand extends Command {
  constructor() {
    super({
      name: "deletecrowns",
      description: "Deletes user's crowns either locally or globally.",
      usage: ["deletecrowns", "deletecrowns global"],
      aliases: ["delcrowns"],
      allow_banned: true,
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = client.cache.prefix.get(message.guild);
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;

    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });

    let global = false;
    if (args.length !== 0) {
      if (args.join() === "global") {
        global = true;
      } else {
        response.text = `Invalid option; the only available option is: 'global'. See ${cb(
          "help deletecrowns",
          server_prefix
        )}`;
        await response.send();
        return;
      }
    }

    let text;
    let crowns;
    if (global) {
      crowns = await client.models.crowns.find(<CrownInterface>{
        userID: message.author.id,
      });
      text = `Are you sure you want to delete all your **${crowns.length}** crowns **globally**? This will delete your crowns from every server you own crown(s) in. Click on the reaction to continue.`;
    } else {
      crowns = await client.models.crowns.find(<CrownInterface>{
        userID: message.author.id,
        guildID: message.guild.id,
      });
      text = `Are you sure you want to delete your **${crowns.length}** crowns **in this server**? Click on the reaction to continue.`;
    }
    if (crowns.length <= 0) {
      if (global) {
        response.text = "Oop, you don't have any crown. :o";
      } else {
        response.text = "You don't have any crown in this server.";
      }
      await response.send();
      return;
    }
    const msg = await new BotMessage({
      client,
      message,
      text,
      reply: true,
    }).send();

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
    const message_exists = message.channel.messages.cache.get(msg.id);
    if (message_exists) msg.delete();
    if (reactions.size > 0) {
      let delete_stats;
      if (global) {
        delete_stats = await client.models.crowns.deleteMany(<CrownInterface>{
          userID: message.author.id,
        });
        response.text = `Your **${delete_stats.deletedCount}** crowns have been deleted.`;
      } else {
        delete_stats = await client.models.crowns.deleteMany(<CrownInterface>{
          userID: message.author.id,
          guildID: message.guild.id,
        });
        response.text = `Your **${delete_stats.deletedCount}** crowns in this server have been deleted.`;
      }
      if (!delete_stats) {
        response.text = new Template(client, message).get("exception");
        await response.send();
        return;
      }
      await response.send();
    } else {
      response.text = "Reaction wasn't clicked; no changes are made.";
      await response.send();
    }
  }
}

export default DeleteCrownCommand;
