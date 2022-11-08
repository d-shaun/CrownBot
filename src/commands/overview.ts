import {
  APIEmbedField,
  Client,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import Artist from "../handlers/LastFM_components/Artist";
import User from "../handlers/LastFM_components/User";
import cb from "../misc/codeblock";
import esm from "../misc/escapemarkdown";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("overview")
    .setDescription("Display user's scrobble overview for an artist")
    .addStringOption((option) =>
      option
        .setName("artist_name")
        .setDescription("Artist name (defaults to now-playing)")
        .setRequired(false)
        .setAutocomplete(true)
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
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    response.allow_retry = true;
    const db = new DB(bot.models);
    const discord_user =
      interaction.options.getUser("discord_user") || interaction.user;

    const user = await db.fetch_user(interaction.guild.id, discord_user.id);
    const _user = await db.fetch_user(
      interaction.guild.id,
      interaction.user.id
    );

    if (!user) {
      response.text =
        "User is not logged into the bot; please use the `/login` command.";
      return response;
    }
    const lastfm_user = new User({
      username: user.username,
    });

    let artist_name = interaction.options.getString("artist_name");
    if (!artist_name) {
      if (!_user) {
        response.text =
          "**You** are not logged into the bot; please use the `/login` command.";
        return response;
      }
      const _lastfm_user = new User({
        username: _user.username,
      });
      const now_playing = await _lastfm_user.new_get_nowplaying(
        interaction,
        response
      );
      if (now_playing instanceof CommandResponse) return now_playing;
      artist_name = now_playing.artist["#text"];
    }

    const query = await new Artist({
      name: artist_name,
      username: user.username,
    }).user_get_info();

    if (query.lastfm_errorcode || !query.success) {
      return response.error("lastfm_error", query.lastfm_errormessage);
    }

    const artist = query.data.artist;
    if (artist.stats.userplaycount === undefined) return response.fail();
    if (parseInt(artist.stats.userplaycount) <= 0) {
      response.text = `${discord_user.username} hasn't scrobbled ${cb(
        artist.name
      )}.`;
      return response;
    }
    const albums = await lastfm_user.get_albums(artist.name);
    const tracks = await lastfm_user.get_tracks(artist.name);
    if (!albums || !tracks) {
      return response.error("lastfm_error");
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

    response.embeds = [embed];
    return response;
  },
};
