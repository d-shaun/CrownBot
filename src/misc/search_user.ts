import { GuildMember, User } from "discord.js";
import { GuildMessage } from "../classes/Command";
export default async function search_user(
  message: GuildMessage,
  args: string[]
): Promise<User | undefined> {
  if (args.length === 0) {
    return undefined;
  }
  const username = args.join(" ").trim().toLowerCase();
  let user = <GuildMember | undefined>(
    await message.guild.members.fetch({ user: username, force: true })
  );
  if (!user) {
    user = (
      await message.guild.members.fetch({ query: username, limit: 1 })
    )?.first(); // find similar username
  }
  return user ? user.user : undefined;
}
