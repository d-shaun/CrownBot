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
  bot: CrownBot,
  message: GuildMessage
): Promise<UserFetchInterface | undefined> {
  const banned_users: BanInterface[] = await bot.models.bans.find({
    guildID: { $in: [message.guild.id, "any"] },
  });

  const banned_ids = banned_users.map((user) => user.userID);

  const server_db = (<UserInterface[]>await bot.models.serverusers.find({
    guildID: message.guild.id,
  })).filter((user) => !banned_ids.includes(user.userID));

  const entries = [];

  const split_to_chunks = (arr: any[], len: number) => {
    const chunks = [],
      n = arr.length;
    let i = 0;

    while (i < n) {
      chunks.push(arr.slice(i, (i += len)));
    }

    return chunks;
  };

  const split_users = split_to_chunks(server_db, 80);
  const discord: any[] = [];

  for await (const chunk of split_users) {
    const res = await message.guild.members.fetch({
      user: <UserResolvable[]>chunk.map((user) => user.userID),
      force: true,
    });

    const values = [...res.values()];
    discord.push([...values]);
  }

  for await (const user of discord) {
    const djsuser = user[0];
    if (!djsuser) continue;
    const dbuser = server_db.find((user) => user.userID === djsuser.id);
    if (!dbuser) continue;
    entries.push({ discord: djsuser, database: dbuser });
  }

  return { users: entries };
}
