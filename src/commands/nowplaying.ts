import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import moment from "moment";
import GuildChatInteraction from "../classes/GuildChatInteraction";
// import GuildCommandInteraction from "../classes/GuildCommandInteraction";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";
import time_difference from "../misc/time_difference";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription(
      "Shows your currently playing (or the last scrobbled) track"
    )
    .addUserOption((option) =>
      option
        .setName("discord_user")
        .setDescription("User to get now-playing song of (defaults to you)")
        .setRequired(false)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction
  ) {
    const response = new BotMessage({
      bot,
      interaction,
    });

    const db = new DB(bot.models);
    const discord_user =
      interaction.options.getUser("discord_user") || interaction.user;

    const user = await db.fetch_user(interaction.guild.id, discord_user.id);
    if (!user) {
      response.text = "User is not logged in.";
      await response.send();
      return;
    }

    const lastfm_user = new User({ username: user.username, limit: 2 });
    const query = await lastfm_user.get_recenttracks();
    if (!query.success || query.lastfm_errorcode) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }

    const last_song = [...query.data.recenttracks.track].shift();
    if (!last_song) {
      response.text =
        "Couldn't find **any** scrobbled track on your Last.fm account.";
      await response.send();
      return;
    }
    let status_text = "🎵 playing now";

    if (!last_song["@attr"]?.nowplaying) {
      const timestamp = moment.unix(parseInt(last_song.date.uts)).valueOf();
      status_text = "⏹️ scrobbled " + time_difference(timestamp) + " ago";
    }
    const cover = last_song.image.pop();
    const embed = new EmbedBuilder()
      .setTitle("Now playing · " + discord_user.username)
      .setDescription(
        `**${esm(last_song.name)}** by **${esm(
          last_song.artist["#text"]
        )}**\n*${esm(last_song.album["#text"])}*`
      )
      .setFooter({ text: status_text });
    if (cover) embed.setThumbnail(cover["#text"]);
    await interaction.editReply({ embeds: [embed] });
  },
};
