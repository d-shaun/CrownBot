import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import moment from "moment";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";
import parse_spotify from "../misc/parse_spotify_presence";
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
    const lastfm_user = new User({ username: user.username });

    const embeds: EmbedBuilder[] = [];

    // Last.fm now-playing
    await (async () => {
      const now_playing = await lastfm_user.get_nowplaying(bot, interaction, 2);

      if (!now_playing) {
        response.text =
          "Couldn't find **any** scrobbled track on your Last.fm account.";
        await response.send();
        return;
      }
      let status_text = "🎵 playing now on Last.Fm";

      if (!now_playing["@attr"]?.nowplaying && now_playing.date) {
        const timestamp = moment.unix(parseInt(now_playing.date.uts)).valueOf();
        status_text = "⏹️ scrobbled " + time_difference(timestamp) + " ago";
      }

      const cover = now_playing.image?.pop();
      const embed = new EmbedBuilder()
        .setTitle("Last.fm")
        .setDescription(
          `**${esm(now_playing.name)}** by **${esm(
            now_playing.artist["#text"]
          )}**\n*${esm(now_playing.album["#text"])}*`
        )
        .setFooter({ text: status_text });
      if (cover) embed.setThumbnail(cover["#text"]);
      embeds.push(embed);
    })();

    // Spotify presence now-playing
    await (async () => {
      const guild_member = await interaction.guild.members.fetch({
        user: discord_user.id,
      });
      const { artist_name, album_name, track_name, createdTimeStamp } =
        parse_spotify(guild_member);
      if (!(artist_name && album_name && track_name && createdTimeStamp)) {
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("Spotify")
        .setDescription(
          `**${esm(track_name)}** by **${esm(artist_name)}**\n*${esm(
            album_name
          )}*`
        )
        .setFooter({
          text: "🎵 playing now on Spotify ",
        });
      embeds.push(embed);
    })();
    if (embeds.length) await interaction.editReply({ embeds: embeds });
  },
};
