import { Client, Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import moment from "moment";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Shows your scrobbling stats")
    .addUserOption((option) =>
      option
        .setName("discord_user")
        .setDescription("User to get recent tracks of (defaults to you)")
        .setRequired(false)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    const db = new DB(bot.models);
    const discord_user =
      interaction.options.getUser("discord_user") || interaction.user;

    const user = await db.fetch_user(interaction.guild.id, discord_user.id);
    if (!user) {
      response.text = "User is not logged in.";
      return response;
    }

    const lastfm_user = new User({
      username: user.username,
    });
    const user_details = await lastfm_user.get_info();
    if (user_details.lastfm_errorcode || !user_details.success) {
      return response.error("lastfm_error", user_details.lastfm_errormessage);
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
      return response.error("lastfm_error");
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
      return response.error("lastfm_error");
    }
    const stats = [
      { field_name: "Weekly", data: weekly },
      { field_name: "Monthly", data: monthly },
      { field_name: "Yearly", data: yearly },
      { field_name: "All-time", data: all_time },
    ];
    const embed = new EmbedBuilder()
      .setTitle(`${discord_user.username}'s scrobbling stats`)
      .setColor(Colors.DarkGreen)
      .addFields({ name: "Scrobbling since", value: user_registered_date });
    stats.forEach((stat) => {
      const field_name = stat.field_name;
      const data = stat.data;
      embed.addFields({
        name: field_name,
        value:
          `**${data.scrobbles}** scrobbles — **${data.artists}** artists, ` +
          `**${data.albums}** albums, **${data.tracks}** tracks · avg. ${data.average_per_day}/day`,
      });
    });
    response.embeds = [embed];
    return response;
  },
};
