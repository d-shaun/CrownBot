import { EmbedBuilder } from "discord.js";
import moment from "moment";
import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import User from "../../handlers/LastFM_components/User";
import { User as DiscordUser } from "discord.js";
import search_user from "../../misc/search_user";

class StatsCommand extends Command {
  constructor() {
    super({
      name: "stats",
      description: "Displays user's scrobbling stats.",
      usage: ["stats", "stats <username>", "stats <@user>"],
      aliases: ["stat", "st"],
      require_login: true,
      category: "userstat",
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(bot.models);
    let discord_user: DiscordUser | undefined;

    if (args.length > 0) {
      const mention = message.mentions.members?.first();
      discord_user = mention ? mention.user : await search_user(message, args);
    } else {
      discord_user = message.member ? message.member.user : undefined;
    }
    if (!discord_user) {
      response.text = "User not found.";
      await response.send();
      return;
    }
    const user = await db.fetch_user(message.guild.id, discord_user.id);
    if (!user) {
      response.text = "User is not logged into the bot.";
      await response.send();
      return;
    }

    const lastfm_user = new User({
      username: user.username,
    });
    const user_details = await lastfm_user.get_info();
    if (user_details.lastfm_errorcode || !user_details.success) {
      await response.error("lastfm_error", user_details.lastfm_errormessage);
      return;
    }

    const user_registered_date = moment
      .unix(user_details.data.user.registered["#text"])
      .format("MMMM DD, YYYY");

    const requests = [
      lastfm_user.get_stats("LAST_7_DAYS"),
      lastfm_user.get_stats("LAST_30_DAYS"),
      lastfm_user.get_stats("LAST_365_DAYS"),
      lastfm_user.get_stats("ALL"),
    ];
    interface GetStatsResponse {
      date_preset: string;
      scrobbles: number;
      average_per_day: number;
      artists: number;
      albums: number;
      tracks: number;
    }
    let responses: (GetStatsResponse | undefined)[] | undefined;
    await Promise.all(requests).then((res) => {
      responses = res;
    });
    if (!responses || responses.length !== 4) {
      response.text = new Template(bot, message).get("lastfm_error");
      await response.send();
      return;
    }
    let weekly: GetStatsResponse | undefined,
      monthly: GetStatsResponse | undefined,
      yearly: GetStatsResponse | undefined,
      all_time: GetStatsResponse | undefined;

    for (const item of responses) {
      switch (item?.date_preset) {
        case "LAST_7_DAYS":
          weekly = item;
          break;
        case "LAST_30_DAYS":
          monthly = item;
          break;
        case "LAST_365_DAYS":
          yearly = item;
          break;
        case "ALL":
          all_time = item;
      }
    }

    if (!(weekly && monthly && yearly && all_time)) {
      response.text = new Template(bot, message).get("lastfm_error");
      await response.send();
      return;
    }
    const stats = [
      { field_name: "Weekly", data: weekly },
      { field_name: "Monthly", data: monthly },
      { field_name: "Yearly", data: yearly },
      { field_name: "All-time", data: all_time },
    ];
    const embed = new EmbedBuilder()
      .setTitle(`${message.author.username}'s scrobbling stats`)
      .setColor(message.member?.displayColor || 0x0)
      .addField("Scrobbling since", user_registered_date);
    stats.forEach((stat) => {
      const field_name = stat.field_name;
      const data = stat.data;
      embed.addField(
        field_name,
        `**${data.scrobbles}** scrobbles — **${data.artists}** artists, ` +
          `**${data.albums}** albums, **${data.tracks}** tracks · avg. ${data.average_per_day}/day`
      );
    });

    await message.channel.send({ embeds: [embed] });
  }
}

export default StatsCommand;