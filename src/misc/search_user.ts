import { GuildMember, User, UserResolvable } from "discord.js";
import { GuildMessage } from "../classes/Command";

/**
 * Searches for a user in a server either by ID or username.
 *
 * @param message
 * @param args
 */
export default async function search_user(
  message: GuildMessage,
  args: string[]
): Promise<User | undefined> {
  if (args.length === 0) {
    return undefined;
  }
  const username = args.join(" ").trim().toLowerCase();
  let user: GuildMember | undefined;
  // workaround to support resolving user ID and searching username
  try {
    user = await message.guild.members.fetch({
      user: <UserResolvable>username,
      force: true,
    });
  } catch (_) {
    user = undefined;
  }

  console.log(user);

  if (!user) {
    user = (
      await message.guild.members.fetch({ query: username, limit: 1 })
    )?.first(); // find similar username
  }
  console.log(user);
  return user ? user.user : undefined;
}
