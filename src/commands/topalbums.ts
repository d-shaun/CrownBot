import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import Artist from "../handlers/LastFM_components/Artist";
import User from "../handlers/LastFM_components/User";
import cb from "../misc/codeblock";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("topalbums")
    .setDescription("List user's top-played albums of an artist")
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

    let artist_name = interaction.options.getString("artist_name");

    if (!artist_name) {
      const now_playing = await lastfm_user.new_get_nowplaying(
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
    if (
      !artist.stats.userplaycount ||
      parseInt(artist.stats.userplaycount) <= 0
    ) {
      response.text = `You haven't listened to ${cb(artist.name)}`;
      return response;
    }
    const albums = await lastfm_user.get_albums(artist.name);
    if (!albums) {
      return response.error("lastfm_error");
    }
    if (!albums.length) {
      response.text =
        "Couldn't find any album that you *may* have scrobbled from this artist.";
      return response;
    }

    const embed = new EmbedBuilder()
      .setDescription(`Album plays — **${albums.length}** albums`)
      .setTitle(
        `${interaction.user.username}'s top-played albums by ${cb(artist.name)}`
      );

    const data_list = albums.map((elem) => {
      return `${elem.name} — **${elem.plays} play(s)**`;
    });

    response.paginate = true;
    response.paginate_embed = embed;
    response.paginate_data = data_list;
    return response;
  },
};
