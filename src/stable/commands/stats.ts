import { Message, MessageEmbed } from "discord.js";
import moment from "moment";
import Command, { GuildMessage } from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import BotMessage from "../../handlers/BotMessage";
import DB from "../../handlers/DB";
import LastFMUser from "../../handlers/LastFMUser";
import { Template } from "../../classes/Template";

class StatsCommand extends Command {
  constructor() {
    super({
      name: "stats",
      description: "Displays user's scrobbling stats.",
      usage: ["stats"],
      aliases: ["stat", "st"],
      require_login: true,
      category: "userstat",
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild?.id, message.author.id);
    if (!user) return;
    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });
    const user_details = await lastfm_user.get_info();
    if (!user_details) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    const user_registered_date = moment
      .unix(user_details.user.registered["#text"])
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
      response.text = new Template(client, message).get("lastfm_error");
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
      .setColor(message.member?.displayColor || "000000")
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

    await message.channel.send(embed);
  }
}

export default StatsCommand;
