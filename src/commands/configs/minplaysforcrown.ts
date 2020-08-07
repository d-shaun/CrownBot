import CrownBotClass from "../../classes/CrownBot";
import { Message, MessageReaction, User } from "discord.js";
import CrownBot from "../../handlers/CrownBot";
import BotMessage from "../../handlers/BotMessage";
import { Template } from "../../classes/Template";
import { ModelOptions } from "mongoose";
import DB from "../../handlers/DB";

export default class MinPlaysForCrown {
  name = "minplaysforcrown";
  description =
    "This sets the minimum plays required for users to get crown in a server. \n" +
    "For example, running `&config minplaysforcrown 10` would then require users to " +
    "have at least 10 plays on an artist before they get the crown.\n\n" +
    "Examples: \n`&config minplaysforcrown 30` \n `&config minplaysforcrown 20`";
  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const db = new DB(client.models);
    let current_val = 1;
    const server_config = client.get_cached_config(message);
    if (server_config) current_val = server_config.min_plays_for_crown;
    const response = new BotMessage({ client, message, text: "", reply: true });
    if (!message.guild) return;
    if (args.length !== 1) {
      response.reply = false;
      response.text =
        `Current value: **${current_val}**\n\n` + this.description;
      await response.send();
      return;
    }
    const number = parseInt(args[0]);
    if (!number || number <= 0) {
      response.text =
        "Invalid number passed; see `&config minplaysforcrown` for help.";
      await response.send();
      return;
    }
    const existing_crowns: Document[] = await client.models.crowns.find({
      guildID: message.guild.id,
      artistPlays: {
        $lt: number,
      },
    });
    if (existing_crowns.length) {
      const msg = await new BotMessage({
        client,
        message,
        text:
          `You are setting the minimum plays required to gain a crown in this server to **${number}**.\n` +
          `There are existing **${existing_crowns.length}** crowns in this server with less than **${number}** plays \n\n` +
          `:warning: Reacting the tick mark will __delete__ **${existing_crowns.length}** crowns and set the specified limit.`,
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
      msg.delete();

      if (reactions.size > 0) {
        const config = await db.server_config(message);
        config.min_plays_for_crown = number;
        await config.save();
        await client.models.crowns.deleteMany({
          guildID: message.guild.id,
          artistPlays: {
            $lt: number,
          },
        });
        response.text =
          `Minimum required plays for a crown in this server has been set to **${number}** ` +
          `and existing **${existing_crowns.length}** crowns with less than the specified plays ` +
          `have been deleted.`;
        await response.send();
      } else {
        response.text = "Reaction wasn't clicked; no changes are made.";
        await response.send();
      }
    } else {
      const config = await db.server_config(message);
      config.min_plays_for_crown = number;
      await config.save();
      response.text = `Minimum required plays for a crown in this server has been set to **${number}**.`;
      await response.send();
    }
    client.server_configs = undefined;
  }
}
