import { Message, MessageEmbed } from "discord.js";
import Command from "../classes/Command";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import LastFMUser from "../handlers/LastFMUser";

class StatsCommand extends Command {
  constructor() {
    super({
      name: "stats",
      description: "Displays user's scrobbling stats.",
      usage: ["stats"],
      aliases: ["stat", "st"],
      require_login: true,
      beta: true,
      hidden: true,
      owner_only: true,
    });
  }

  async run(client: CrownBot, message: Message, args: String[]) {
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.author.id);
    if (!user) return;
    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });
    const weekly = await lastfm_user.get_stats("LAST_7_DAYS");
    const monthly = await lastfm_user.get_stats("LAST_30_DAYS");
    const yearly = await lastfm_user.get_stats("LAST_365_DAYS");
    const all_time = await lastfm_user.get_stats("ALL");
    if (!(weekly && monthly && yearly && all_time)) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    const stats = [
      { field_name: "Weekly", data: weekly },
      { field_name: "Monthly", data: monthly },
      { field_name: "Yearly", data: yearly },
      { field_name: "All-time", data: all_time },
    ];
    const embed = new MessageEmbed()
      .setTitle(`${message.author.username}'s scrobbling stats`)
      .setColor(message.member?.displayColor || "000000");

    stats.forEach((stat) => {
      const field_name = stat.field_name;
      const data = stat.data;
      embed.addField(
        field_name,
        `**${data.scrobbles}** scrobbles — **${data.artists}** artists, **${data.albums}** albums, **${data.tracks}** tracks · avg. ${data.average_per_day}/day`
      );
    });

    await message.channel.send(embed);
  }
}

export default StatsCommand;
