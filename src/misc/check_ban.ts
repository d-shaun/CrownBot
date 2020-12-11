import { GuildMessage } from "../classes/Command";
import CrownBot from "../handlers/CrownBot";

interface Response {
  banned: boolean;
  type?: string;
}

export default async function check_ban(
  message: GuildMessage,
  client: CrownBot
): Promise<Response> {
  const response = {
    banned: false,
    type: <undefined | string>undefined,
  };
  const bans = await client.models.bans
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
