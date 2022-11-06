import { Client, Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import moment from "moment";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";
import time_difference from "../misc/time_difference";
import truncate_str from "../misc/truncate";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("recent")
    .setDescription("Shows your recently played tracks")
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

    const lastfm_user = new User({ username: user.username, limit: 10 });
    const query = await lastfm_user.get_recenttracks();
    if (!query.success || query.lastfm_errorcode) {
      return response.error("lastfm_error", query.lastfm_errormessage);
    }

    const recent_tracks = query.data.recenttracks.track.map((track, i) => {
      track.id = i;
      return track;
    });

    if (!recent_tracks || !recent_tracks.length) {
      response.text = `Couldn't find any scrobbles on this account.`;
      return response;
    }
    const embed = new EmbedBuilder()
      .setTitle(`Recent tracks`)
      .setFooter({
        text: `Displaying recent ${recent_tracks.length} tracks played by ${discord_user.username}.`,
      })
      .setColor(Colors.DarkGreen);
    for (const track of recent_tracks) {
      let time_str = "Unknown";
      if (track["@attr"]?.nowplaying) {
        time_str = "Playing";
      } else {
        const timestamp = moment.unix(parseInt(track.date.uts)).valueOf();
        time_str = time_difference(timestamp) + " ago";
      }
      embed.addFields({
        name: time_str,
        value: `**${esm(track.artist["#text"], true)}** — [${esm(
          track.name,
          true
        )}](${truncate_str(track.url, 200)}) · ${esm(
          track.album["#text"],
          true
        )}`,
      });
    }
    response.embeds = [embed];
    return response;
  },
};
