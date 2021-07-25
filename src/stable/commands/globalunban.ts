import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";

class GlobalUnbanCommand extends Command {
  constructor() {
    super({
      name: "globalunban",
      description: "Globally unban without affecting per-guild ban.",
      usage: ["globalunban <@user>"],
      aliases: ["gubn", "gub"],
      hidden: true,
      owner_only: true,
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });

    let userID;
    const mentioned = message.mentions.members?.first()?.user;
    if (!mentioned) {
      if (args.length === 0) {
        response.text = "No user ID provided.";
        await response.send();
        return;
      } else {
        userID = args.join().trim();
      }
    } else {
      userID = mentioned.id;
    }
    if (!userID) throw "HOW!?";

    if (
      !(await bot.models.bans.findOne({
        userID,
        guildID: "any",
      }))
    ) {
      response.text = `\`${userID}\` isn't globally banned.`;
      await response.send();
      return;
    }

    const unbanned = await bot.models.bans.deleteOne({
      userID,
      guildID: "any",
    });
    if (unbanned) {
      response.text = `Global ban entry deleted for \`${userID}\`.`;
    } else {
      response.text = `Something went wrong.`;
    }
    await response.send();
  }
}

export default GlobalUnbanCommand;
