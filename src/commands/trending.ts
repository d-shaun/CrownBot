import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import Artist from "../handlers/LastFM_components/Artist";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trending")
    .setDescription("Displays artist's recently trending tracks on Last.fm.")
    .addStringOption((option) =>
      option
        .setName("artist_name")
        .setDescription("Artist name")
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

    const artist = new Artist({ name: artist_name });
    const query = await artist.get_info();

    if (query.lastfm_errorcode || !query.success) {
      return response.error("lastfm_error", query.lastfm_errormessage);
    }
    artist.name = query.data.artist.name;

    const trending = await artist.get_trending();
    if (!trending) {
      return response.error("lastfm_error");
    }

    const embed = new EmbedBuilder().setTitle(
      `${esm(artist.name)}'s trending tracks this week`
    );

    const data_list = trending.map((elem) => {
      return `**${elem.name}** — **${elem.listeners}** listeners`;
    });

    response.paginate = true;
    response.paginate_embed = embed;
    response.paginate_data = data_list;
    return response;
  },
};
