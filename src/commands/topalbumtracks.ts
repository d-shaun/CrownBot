import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import Album from "../handlers/LastFM_components/Album";
import User from "../handlers/LastFM_components/User";
import cb from "../misc/codeblock";
import esm from "../misc/escapemarkdown";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("topalbumtracks")
    .setDescription("List user's top-played tracks in an album")
    .addStringOption((option) =>
      option
        .setName("album_name")
        .setDescription("Album name (defaults to now-playing)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("artist_name")
        .setDescription("The artist's name")
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
    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (!user) return response.fail();
    const lastfm_user = new User({
      username: user.username,
    });

    let album_name = interaction.options.getString("album_name");
    let artist_name = interaction.options.getString("artist_name");

    if (!album_name) {
      const now_playing = await lastfm_user.new_get_nowplaying(
        interaction,
        response
      );
      if (now_playing instanceof CommandResponse) return now_playing;
      album_name = now_playing.album["#text"];
      artist_name = now_playing.artist["#text"];
    }

    if (!artist_name) {
      const query = await new Album({
        name: album_name,
        limit: 1,
      }).search();

      if (query.lastfm_errorcode || !query.success) {
        return response.error("lastfm_error", query.lastfm_errormessage);
      }

      const album = query.data.results.albummatches.album[0];
      if (!album) {
        response.text = `Couldn't find the album.`;
        return response;
      }
      album_name = album.name;
      artist_name = album.artist;
    }

    const query = await new Album({
      name: album_name,
      artist_name,
      username: user.username,
    }).user_get_info();
    if (query.lastfm_errorcode || !query.success) {
      return response.error("lastfm_error", query.lastfm_errormessage);
    }
    const album = query.data.album;
    const album_tracks = await lastfm_user.get_album_tracks(
      album.artist,
      album.name
    );
    if (!album_tracks) {
      return response.error("lastfm_error");
    }
    if (!album_tracks.length) {
      response.text = "Couldn't find any track that you *may* have scrobbled.";
      return response;
    }

    const total_scrobbles = album_tracks.reduce((a, b) => a + b.plays, 0);
    const embed = new EmbedBuilder()
      .setDescription(
        `Track plays — **${album_tracks.length}** tracks · **${total_scrobbles}** plays`
      )
      .setTitle(
        `${interaction.user.username}'s top-played tracks from the album ${cb(
          album.name
        )}`
      )
      .setFooter({ text: `"${album.name}" by ${album.artist}` });
    const data_list = album_tracks.map((elem) => {
      return `${esm(elem.name)} — **${elem.plays} play(s)**`;
    });

    response.paginate = true;
    response.paginate_embed = embed;
    response.paginate_data = data_list;
    return response;
  },
};
