import { Message, User } from "discord.js";
export default function search_user(
  message: Message,
  args: string[]
): User | undefined {
  if (args.length === 0) {
    return undefined;
  }
  const username = args.join(" ").trim();
  let user = message.guild?.members.cache.find((member) => {
    return member.user.username
      .toLowerCase()
      .startsWith(username.toLowerCase());
  });

  return user ? user.user : undefined;
}
