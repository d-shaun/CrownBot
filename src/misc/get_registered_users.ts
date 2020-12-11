import { GuildMember } from "discord.js";
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

export default async function get_registered_users(
  client: CrownBot,
  message: GuildMessage
): Promise<UserFetchInterface | undefined> {
  const database_users: UserInterface[] = await client.models.serverusers.find({
    guildID: message.guild.id,
  });
  const banned_users: BanInterface[] = await client.models.bans.find({
    guildID: { $in: [message.guild.id, "any"] },
  });
  const banned_ids = banned_users.map((user) => user.userID);

  const relevant_users = [
    ...(
      await message.guild.members.fetch({
        user: database_users.map((user) => user.userID),
      })
    ).entries(),
  ].filter((user) => !banned_ids.includes(user[0]));

  const relevant_users_id = relevant_users.map((user) => user[0]);

  const users = database_users
    .filter((database_user) => relevant_users_id.includes(database_user.userID))
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
