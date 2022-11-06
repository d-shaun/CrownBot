import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import { UserTopArtist } from "../interfaces/ArtistInterface";
import { Period } from "../interfaces/LastFMQueryInterface";
import esm from "../misc/escapemarkdown";
import time_difference from "../misc/time_difference";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription(
      "Lists user's weekly, monthly, or yearly top artists or songs."
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("List type")
        .setRequired(true)
        .addChoices(
          {
            name: "Artist",
            value: "artist",
          },
          {
            name: "Tracks",
            value: "track",
          },
          {
            name: "Album",
            value: "album",
          }
        )
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Time-frame for the list")
        .setRequired(false)
        .addChoices(
          {
            name: "Weekly",
            value: "7day",
          },
          {
            name: "Monthly",
            value: "1month",
          },
          {
            name: "Yearly",
            value: "12month",
          },
          {
            name: "All-time",
            value: "overall",
          }
        )
    )
    .addIntegerOption((option) =>
      option
        .setName("size")
        .setDescription("Number of entries to show (default: 10, max: 30)")
        .setRequired(false)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    const db = new DB(bot.models);
    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (!user) return response.fail();
    const lastfm_user = new User({
      username: user.username,
    });

    const list_type = interaction.options.getString("type", true);
    const time_frame = <Period>(
      (interaction.options.getString("time") || "7day")
    );

    let time_text = "weekly";

    switch (time_frame) {
      case "overall":
        time_text = "overall";
        break;
      case "7day":
        time_text = "weekly";
        break;
      case "1month":
        time_text = "monthly";
        break;
      case "12month":
        time_text = "yearly";
        break;
    }

    const length = interaction.options.getInteger("size") || 10;

    if (length > 30 || length < 0) {
      return response.error(
        "custom",
        "List size cannot be less than 0 or greater than 30."
      );
    }

    lastfm_user.configs.limit = length;

    if (list_type === "artist") {
      const query = await lastfm_user.get_top_artists({
        period: time_frame,
      });
      if (query.lastfm_errorcode || !query.success) {
        return response.error("lastfm_error", query.lastfm_errormessage);
      }
      let top_artists = query.data.topartists.artist;

      let last_log: any | null = null;
      if (time_frame === "overall") {
        last_log = await bot.models.listartistlog.findOne({
          user_id: interaction.user.id,
          guild_id: interaction.guild.id,
        });
      }

      let cached_log: UserTopArtist["topartists"]["artist"];
      if (last_log && last_log.stat.length) {
        cached_log = last_log.stat;
      } else {
        cached_log = [];
      }

      top_artists = top_artists.map((entry) => {
        const log = cached_log.find((lg) => {
          return lg.name === entry.name;
        });
        if (log) {
          entry.last_count = log.playcount;
        } else {
          entry.is_new = true;
        }
        return entry;
      });

      cached_log = cached_log.filter((elem) => {
        // remove the older ones that are still available
        return !top_artists.find((el) => el.name === elem.name);
      });

      // combine the newer one with the one in db. ^ this filter removes duplicates.
      cached_log = [...top_artists, ...cached_log];

      const embed_list = top_artists
        .map((artist) => {
          let count_diff;
          let diff_str = "";
          if (artist.last_count) {
            count_diff =
              parseInt(artist.playcount) - parseInt(artist.last_count);
          }

          if (count_diff && count_diff < 0) {
            diff_str = ` ― (:small_red_triangle_down: ${count_diff} ${
              count_diff > 1 ? "plays" : "play"
            })`;
          } else if (count_diff && count_diff > 0) {
            diff_str = ` ― (+${count_diff} ${
              count_diff > 1 ? "plays" : "play"
            })`;
          }

          return `${artist["@attr"].rank}. **${esm(artist.name)}** — **${
            artist.playcount
          }** plays ${diff_str}`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle(
          `${interaction.user.username}'s ${time_text}-top ${list_type}s`
        )
        .setDescription(embed_list);
      if (last_log) {
        embed.setFooter({
          text: `Last checked ${time_difference(last_log.timestamp)} ago.`,
        });
      }
      if (time_frame === "overall") {
        await db.log_list_artist(
          cached_log,
          interaction.user.id,
          interaction.guild.id
        );
      }
      response.embeds = [embed];
      return response;
    } else if (list_type === "track") {
      const query = await lastfm_user.get_top_tracks({
        period: time_frame,
      });
      if (query.lastfm_errorcode || !query.success) {
        return response.error("lastfm_error", query.lastfm_errormessage);
      }
      const top_tracks = query.data.toptracks.track;
      const embed_list = top_tracks
        .map((track) => {
          return `${track["@attr"].rank}. **${esm(track.name)}** by **${esm(
            track.artist.name
          )}**— **${track.playcount}** plays`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle(
          `${interaction.user.username}'s ${time_text}-top ${list_type}s`
        )
        .setDescription(embed_list);
      response.embeds = [embed];
      return response;
    } else if (list_type === "album") {
      const query = await lastfm_user.get_top_albums({
        period: time_frame,
      });
      if (query.lastfm_errorcode || !query.success) {
        return response.error("lastfm_error", query.lastfm_errormessage);
      }
      const top_albums = query.data.topalbums.album;

      const embed_list = top_albums
        .map((album, i) => {
          return `${i + 1}. **${esm(album.name)}** by **${esm(
            album.artist.name
          )}**— **${album.playcount}** plays`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle(
          `${interaction.user.username}'s ${time_text}-top ${list_type}s`
        )
        .setDescription(embed_list);
      response.embeds = [embed];
      return response;
    } else {
      return response.fail();
    }
  },
};
