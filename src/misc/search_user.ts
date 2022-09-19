import { GuildMember, User, UserResolvable } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";

/**
 * Searches for a user in a server either by ID or username.
 *
 * @param interaction
 * @param args
 */
export default async function search_user(
  interaction: GuildChatInteraction,
  args: string[]
): Promise<User | undefined> {
  if (args.length === 0) {
    return undefined;
  }
  const username = args.join(" ").trim().toLowerCase();
  let user: GuildMember | undefined;
  // workaround to support resolving user ID and searching username
  try {
    user = await interaction.guild.members.fetch({
      user: <UserResolvable>username,
      force: true,
    });
  } catch (_) {
    user = undefined;
  }

  if (!user) {
    user = (
      await interaction.guild.members.fetch({ query: username, limit: 1 })
    )?.first(); // find similar username
  }
  return user ? user.user : undefined;
}
