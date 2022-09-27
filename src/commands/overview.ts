import {
  APIEmbedField,
  Client,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import Artist from "../handlers/LastFM_components/Artist";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";
import { Template } from "../classes/Template";
import cb from "../misc/codeblock";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("overview")
    .setDescription("Displays user's scrobble overview for an artist.")
    .addStringOption((option) =>
      option
        .setName("artist_name")
        .setDescription("Artist name (defaults to now-playing)")
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("discord_user")
        .setDescription("User to get overview stats of (defaults to you)")
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
      response.text =
        "User is not logged into the bot; please use the `/login` command.";
      await response.send();
      return;
    }
    const lastfm_user = new User({
      username: user.username,
    });

    let artist_name = interaction.options.getString("artist_name");
    if (!artist_name) {
      const now_playing = await lastfm_user.get_nowplaying(bot, interaction);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
    }

    const query = await new Artist({
      name: artist_name,
      username: user.username,
    }).user_get_info();

    if (query.lastfm_errorcode || !query.success) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }

    const artist = query.data.artist;
    if (artist.stats.userplaycount === undefined) return;
    if (parseInt(artist.stats.userplaycount) <= 0) {
      response.text = `${discord_user.username} hasn't scrobbled ${cb(
        artist.name
      )}.`;
      await response.send();
      return;
    }
    const albums = await lastfm_user.get_albums(artist.name);
    const tracks = await lastfm_user.get_tracks(artist.name);
    if (!albums || !tracks) {
      response.text = new Template().get("lastfm_error");
      await response.send();
      return;
    }

    const truncate = function (str: string, n: number) {
      return str.length > n ? str.substr(0, n - 1) + "..." : str;
    };

    const album_str = albums.slice(0, 15).map((album, i) => {
      return `${i + 1}. **${esm(truncate(album.name, 25))}** (${album.plays})`;
    });

    const track_str = tracks.slice(0, 15).map((track, i) => {
      return `${i + 1}. **${esm(truncate(track.name, 25))}** (${track.plays})`;
    });

    const has_crown = await bot.models.crowns.findOne({
      artistName: artist.name,
      guildID: interaction.guild.id,
    });

    const fields: APIEmbedField[] = [
      {
        name: "Scrobbles",
        value: `${has_crown ? ":crown:" : ""} **${
          artist.stats.userplaycount
        }** plays—**${albums.length}** albums · **${tracks.length}** tracks`,
        inline: false,
      },
    ];

    if (album_str.length) {
      fields.push({
        name: "Top albums",
        value: album_str.join("\n"),
        inline: true,
      });
    }

    if (track_str.length) {
      fields.push({
        name: "Top tracks",
        value: track_str.join("\n"),
        inline: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${cb(artist.name)} overview for ${discord_user.username}`)
      .addFields(fields);

    await interaction.editReply({ embeds: [embed] });
  },
};
