import { GuildMember, UserResolvable } from "discord.js";
import { GuildMessage } from "../classes/Command";
import CrownBot from "../handlers/CrownBot";
import { BanInterface } from "../stable/models/Bans";
import { UserInterface } from "../stable/models/Users";

interface UserFetchInterface {
  users: {
    discord: GuildMember;
    database: UserInterface;
  }[];
}

/**
 * Returns users registered to the bot in a server.
 * - Filters out locally and/or globally banned users.
 * @param client
 * @param message
 */
export default async function get_registered_users(
  client: CrownBot,
  message: GuildMessage
): Promise<UserFetchInterface | undefined> {
  const banned_users: BanInterface[] = await client.models.bans.find({
    guildID: { $in: [message.guild.id, "any"] },
  });
  const banned_ids = banned_users.map((user) => user.userID);

  const server_db = (<UserInterface[]>await client.models.serverusers.find({
    guildID: message.guild.id,
  })).filter((user) => !banned_ids.includes(user.userID));

  const entries = [];

  const discord = await message.guild.members.fetch({
    user: <UserResolvable[]>server_db.map((user) => user.userID),
    force: true,
  });

  for await (const user of discord) {
    const djsuser = discord.last();
    if (!djsuser) continue;
    const dbuser = server_db.find((user) => user.userID === djsuser.id);
    if (!dbuser) continue;
    entries.push({ discord: djsuser, database: dbuser });
  }

  return { users: entries };
}
