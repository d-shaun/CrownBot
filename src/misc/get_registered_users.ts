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
  const database_users: UserInterface[] = await bot.models.serverusers.find({
    guildID: message.guild.id,
  });
  const banned_users: BanInterface[] = await bot.models.bans.find({
    guildID: { $in: [message.guild.id, "any"] },
  });
  const banned_ids = banned_users.map((user) => user.userID);

  const relevant_users = [
    ...(
      await message.guild.members.fetch({
        user: <UserResolvable[]>database_users.map((user) => user.userID),
        force: true,
      })
    ).entries(),
  ].filter((user) => !banned_ids.includes(user[0]));

  const relevant_users_id = relevant_users.map((user) => user[0]);

  const users = database_users
    .filter((database_user) =>
      relevant_users_id.includes(<any>database_user.userID)
    )
    .map((database_user) => {
      const t_2 = relevant_users.find(
        ([user_id]) => user_id === database_user.userID
      );
      if (!t_2) throw "not possible";
      const discord = t_2[1];
      return {
        discord,
        database: database_user,
      };
    });

  return { users };
}
