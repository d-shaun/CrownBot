import { Message } from "discord.js";
import CrownBot from "../handlers/CrownBot";
import { BanInterface } from "../stable/models/Bans";
import { UserInterface } from "../stable/models/Users";
interface UserFetchInterface {
  users: UserInterface[];
  banned_users: BanInterface[];
  banned_ids: string[];
}

export default async function get_registered_users(
  client: CrownBot,
  message: Message
): Promise<UserFetchInterface | undefined> {
  if (!message.guild) return undefined;

  const user_ids = message.guild.members.cache.map((member) => member.id);
  if (!user_ids) throw "Failed to fetch guild members.";
  const all_users: UserInterface[] = await client.models.serverusers
    .find({
      guildID: message.guild.id,
      userID: {
        $in: user_ids,
      },
    })
    .lean();

  const banned_users: BanInterface[] = await client.models.bans
    .find({
      userID: { $in: user_ids },
      guildID: { $in: [message.guild.id, "any"] },
    })
    .lean();
  const banned_ids = banned_users.map((user) => user.userID);
  const users = all_users.filter((user) => !banned_ids.includes(user.userID));
  return { users, banned_users, banned_ids };
}
