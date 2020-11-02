import { Message, User } from "discord.js";
export default async function search_user(
  message: Message,
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
