import { User } from "discord.js";
import { GuildMessage } from "../classes/Command";
export default async function search_user(
  message: GuildMessage,
  args: string[]
): Promise<User | undefined> {
  if (args.length === 0) {
    return undefined;
  }
  const username = args.join(" ").trim().toLowerCase();
  const user = (
    await message.guild?.members.fetch({ query: username })
  )?.first(); // find similar username
  return user ? user.user : undefined;
}
