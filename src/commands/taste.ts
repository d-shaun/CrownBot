import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import { UserTopArtist } from "../interfaces/ArtistInterface";
import esm from "../misc/escapemarkdown";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("taste")
    .setDescription("Compare same artists' plays between two users")
    .addUserOption((option) =>
      option
        .setName("discord_user")
        .setDescription("User to compare with")
        .setRequired(true)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    response.allow_retry = true;
    const db = new DB(bot.models);

    const mentioned_user = interaction.options.getUser("discord_user", true);

    const u1 = await db.fetch_user(interaction.guild.id, interaction.user.id);
    const u2 = await db.fetch_user(interaction.guild.id, mentioned_user.id);

    if (!u1) return response.error("not_logged");
    if (!u2)
      return response.error(
        "custom",
        "The mentioned user hasn't logged into the bot on this server."
      );

    const responses: UserTopArtist["topartists"]["artist"][] = [];

    for (const user of [u1, u2]) {
      const lastfm_user = new User({
        username: user.username,
        limit: 200,
      });
      const query = await lastfm_user.get_top_artists({
        period: "overall",
      });
      if (query.lastfm_errorcode || !query.success) {
        return response.error("lastfm_error", query.lastfm_errormessage);
      }
      responses.push(query.data.topartists.artist);
    }

    let plays: {
      name: string;
      userone_plays: number;
      usertwo_plays: number;
    }[] = [];
    const similar_artists = responses[0].filter((artist) => {
      return responses[1].find((ar) => ar.name === artist.name);
    });
    similar_artists.forEach((artist) => {
      const usertwo_artist = responses[1].find((ar) => ar.name === artist.name);
      if (!usertwo_artist) return;
      plays.push({
        name: artist.name,
        userone_plays: parseInt(artist.playcount),
        usertwo_plays: parseInt(usertwo_artist.playcount),
      });
    });

    plays = plays.sort((a, b) => {
      const cur_diff = Math.abs(b.userone_plays - b.usertwo_plays);
      const then_diff = Math.abs(a.userone_plays - a.usertwo_plays);
      return then_diff - cur_diff;
    });
    if (plays.length > 25) plays.length = 25;

    const embed = new EmbedBuilder().setTitle(
      `\`\`${interaction.user.username}\`\`'s and \`\`${mentioned_user.username}\`\`'s taste comparison `
    );
    const fields = plays.map((stat) => {
      const { name, userone_plays, usertwo_plays } = stat;
      return {
        name: esm(name),
        value: `${userone_plays} plays — ${usertwo_plays} plays`,
        inline: true,
      };
    });

    embed.addFields(fields);

    response.embeds = [embed];
    return response;
  },
};
