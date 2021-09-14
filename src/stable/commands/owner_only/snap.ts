import { MessageReaction, User } from "discord.js";
import { GuildMessage } from "../../../classes/Command";
import BotMessage from "../../../handlers/BotMessage";
import CrownBot from "../../../handlers/CrownBot";
import DB from "../../../handlers/DB";

export default class SnapCommand {
  name = "snap";

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const db = new DB(client.models);
    if (message.author.id !== client.owner_ID) return; // just to be safe
    const res = await db.find_multiple_usernames();

    if (args) {
      //
    }

    const msg = await new BotMessage({
      client,
      message,
      text: `**${res.length}** users will be affected by this action. Continue?`,
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
    if (reactions.size <= 0) return;

    for await (const user of res) {
      await db.remove_user(user.guildID, user.userID);
      await db.snap(user.guildID, user.userID);
    }

    await message.channel.send(
      "https://tenor.com/view/thanos-infinity-gauntlet-snap-finger-snap-gif-12502580"
    );
  }
}
