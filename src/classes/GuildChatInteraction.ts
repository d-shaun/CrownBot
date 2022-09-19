import { ChatInputCommandInteraction, Guild, TextChannel } from "discord.js";

export default interface GuildChatInteraction
  extends ChatInputCommandInteraction {
  guild: Guild;
  channel: TextChannel;
}
