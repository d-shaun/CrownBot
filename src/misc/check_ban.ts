import { GuildMessage } from "../classes/Command";
import CrownBot from "../handlers/CrownBot";

interface Response {
  banned: boolean;
  type?: string;
}

/**
 * Checks if a user is banned (both locally or globally).
 * - Both local and global bans will result in `<response>.banned` being `true`
 * - The type of the ban (if banned) is specified in `<response>.type`.
 *
 * @param message
 * @param bot
 */
export default async function check_ban(
  message: GuildMessage,
  bot: CrownBot
): Promise<Response> {
  const response = {
    banned: false,
    type: <undefined | string>undefined,
  };
  const bans = await bot.models.bans
    .find({
      userID: message.author.id,
      guildID: { $in: [message.guild.id, "any"] },
    })
    .lean();
  if (!bans.length) {
    return response;
  }

  response.banned = true;
  response.type = "local";
  if (bans.find((ban) => ban.guildID === "any")) {
    response.type = "global";
  }
  return response;
}
