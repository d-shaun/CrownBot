import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import Artist from "../handlers/LastFM_components/Artist";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";
import time_difference from "../misc/time_difference";

import moment from "moment";
// @ts-ignore
import abbreviate from "number-abbreviate";
import { CommandResponse } from "../handlers/CommandResponse";
import { UserArtist } from "../interfaces/ArtistInterface";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("artistplays")
    .setDescription("Display user's playcount of an artist.")
    .addStringOption((option) =>
      option
        .setName("artist_name")
        .setDescription("Artist name (defaults to now-playing)")
        .setRequired(false)
        .setAutocomplete(true)
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

    let last_count = 0;
    const strs = {
      count: "No change",
      time: <boolean | string>false,
    };
    const last_log = await bot.models.artistlog.findOne({
      name: artist.name,
      userID: interaction.user.id,
    });
    if (last_log) {
      last_count = last_log.userplaycount;
      strs.time = time_difference(last_log.timestamp);
    }

    const last_wk_log = await bot.models.whoknowslog.findOne({
      artist_name: artist.name,
      guild_id: interaction.guild.id,
    });

    const count_diff = artist.stats.userplaycount - last_count;
    if (count_diff < 0) {
      strs.count = `:small_red_triangle_down: ${count_diff}`;
    } else if (count_diff > 0) {
      strs.count = `+${count_diff}`;
    }
    const aggr_str = strs.time
      ? `**${strs.count}** since last checked ${strs.time} ago.`
      : "";
    const percentage = (
      (artist.stats.userplaycount / artist.stats.playcount) *
      100
    ).toFixed(2);

    const thumb = artist.image.pop()?.["#text"];

    const short_bio = artist.bio?.summary.replace(
      /<a href.*<\/a>/g,
      ` (Source: [Last.fm](${artist.url}))`
    );

    const text = `# ${esm(artist.name)}\n## Bio\n${short_bio}\n## Stats\n`;
    const embed = new EmbedBuilder().setDescription(text);

    const fields = [
      {
        name: "Global (Last.fm)",
        value: `${abbreviate(artist.stats.playcount, 1)} plays (${abbreviate(
          artist.stats.listeners,
          1
        )} listeners)`,
        inline: true,
      },
    ];
    if (last_wk_log) {
      const aggr_plays = last_wk_log.stat.reduce(
        (acc, cur) => acc + parseInt(cur.userplaycount),
        0
      );
      fields.push({
        name: "This server",
        value: `${aggr_plays} plays (${last_wk_log.stat.length} listeners)`,
        inline: true,
      });
    }

    fields.push({
      name: `${interaction.user.username}'s playcount`,
      value: `**${
        artist.stats.userplaycount
      } play(s)** — (**${percentage}%** of ${abbreviate(
        artist.stats.playcount,
        1
      )} plays) \n ${aggr_str}`,
      inline: false,
    });

    embed.addFields(fields);

    if (thumb) embed.setThumbnail(thumb);

    await this.update_log(bot, interaction, artist);
    response.embeds = [embed];
    return response;
  },

  async update_log(
    client: CrownBot,
    interaction: GuildChatInteraction,
    artist: UserArtist["artist"]
  ) {
    const timestamp = moment.utc().valueOf();

    await client.models.artistlog.findOneAndUpdate(
      {
        name: artist.name,
        userID: interaction.user.id,
      },
      {
        name: artist.name,
        userID: interaction.user.id,
        userplaycount: artist.stats.userplaycount,
        timestamp,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
  },
};
