import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import User from "../handlers/LastFM_components/User";
import esm from "../misc/escapemarkdown";

import axios from "axios";
import moment from "moment";
import { CommandResponse } from "../handlers/CommandResponse";
import Track from "../handlers/LastFM_components/Track";
import generate_random_strings from "../misc/generate_random_strings";
import { LyricsData, show_modal } from "./owner_commands/editlyrics";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("Get the lyrics for a track")
    .addStringOption((option) =>
      option
        .setName("track_name")
        .setDescription("Track name (defaults to now-playing)")
        .setRequired(false)
    )
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

    // https://whateverendpoint/ --- appends ?gquery=string query
    const { LYRICS_ENDPOINT } = process.env;
    const random_id = generate_random_strings(8);

    const db = new DB(bot.models);
    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (!user) return response.fail();
    const lastfm_user = new User({
      username: user.username,
    });
    let track_name = interaction.options.getString("track_name");
    let artist_name = interaction.options.getString("artist_name");

    // Contribute and clear cache buttons (filter & funct)
    const buttonComps: ButtonBuilder[] = [
      new ButtonBuilder()
        .setLabel("✏️ Contribute")
        .setStyle(ButtonStyle.Success)
        .setCustomId("edit" + random_id),
      new ButtonBuilder()
        .setLabel("🔃 Clear cache")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("purge" + random_id),
    ];
    const row = <ActionRowBuilder<ButtonBuilder>>(
      new ActionRowBuilder().addComponents(buttonComps)
    );

    const generate_filter_function = async (data: LyricsData) => {
      return async (new_interaction: ButtonInteraction) => {
        try {
          if (new_interaction.customId === "edit" + random_id) {
            const is_admin = new_interaction.user.id === bot.owner_ID;
            await show_modal(bot, new_interaction, data, is_admin);
          } else if (new_interaction.customId === "purge" + random_id) {
            const fresh_entry = await bot.models.lyricslog.findOne({
              track_name: track.name,
              artist_name: track.artist.name,
            });
            if (!fresh_entry) {
              await new_interaction.reply({
                content:
                  "There's no entry on the database; please consider submitting the lyrics.",
                ephemeral: true,
              });
              return;
            }
            if (fresh_entry.permanent) {
              await new_interaction.reply({
                content:
                  "The lyrics for this track is verified and its cached revision cannot be altered.",
                ephemeral: true,
              });
              return;
            }
            //@ts-ignore
            fresh_entry.delete();

            await new_interaction.reply({
              content:
                "The cached lyrics for this track has been cleared; run the /lyrics command again to obtain a fresh revision.",
              ephemeral: true,
            });
            return;

            //
          }
        } catch (e) {
          console.log(e);
          // add logger here maybe?
          console.log("Unexpected exception occured.");
        }
      };
    };

    const filter = (i: ButtonInteraction) =>
      i.customId === "edit" + random_id || i.customId === "purge" + random_id;
    response.custom_filter = filter;

    if (!track_name) {
      const now_playing = await lastfm_user.new_get_nowplaying(
        interaction,
        response
      );
      if (now_playing instanceof CommandResponse) return now_playing;
      track_name = now_playing.name;
      artist_name = now_playing.artist["#text"];
    }
    if (!artist_name) {
      const query = await new Track({
        name: track_name,
        limit: 1,
      }).search();
      if (query.lastfm_errorcode || !query.success) {
        return response.error("lastfm_error", query.lastfm_errormessage);
      }
      const track = query.data.results.trackmatches.track.shift();
      if (!track) {
        return response.error("custom", "Couldn't find the track");
      }
      track_name = track.name;
      artist_name = track.artist;
    }
    const query = await new Track({
      name: track_name,
      artist_name,
    }).get_info();
    if (query.lastfm_errorcode || !query.success) {
      return response.error("lastfm_error", query.lastfm_errormessage);
    }
    const track = query.data.track;
    const db_entry = await bot.models.lyricslog.findOne({
      track_name: track.name,
      artist_name: track.artist.name,
    });
    const toChunks = (lyrics: string) => {
      return lyrics.match(/(.|[\r\n]){1,2000}/g);
    };
    if (db_entry) {
      const filter_function = await generate_filter_function(db_entry);
      response.custom_hook = filter_function;

      const lyrics =
        `**${db_entry.track_name}** by **${db_entry.artist_name}**\n\n` +
        db_entry.lyrics;
      const lyrics_chunks = toChunks(lyrics);
      if (lyrics_chunks && lyrics_chunks.length) {
        const embeds = [];
        for (const chunk of lyrics_chunks) {
          embeds.push(new EmbedBuilder().setDescription(chunk));
        }
        if (db_entry.permanent) {
          embeds[embeds.length - 1].setFooter({ text: "(⭐ Verified lyrics)" });
        } else {
          embeds[embeds.length - 1].setFooter({ text: "(Cached lyrics)" });
        }
        response.embed_components = [row];
        response.embeds = embeds;
        return response;
      }
    }

    const data: LyricsData = {
      lyrics: "",
      track_name: track.name,
      artist_name: track.artist.name,
    };
    response.embed_components = [row];
    const filter_function = await generate_filter_function(data);
    response.custom_hook = filter_function;

    if (!LYRICS_ENDPOINT) {
      response.text =
        "Couldn't find the source to fetch lyrics from. Please contact the bot maintainer.";
      return response;
    }

    let original_lyrics: null | string = null;
    try {
      type ReturnDataType = {
        error: boolean;
        error_message: string;
        response: null | string;
        id: null | string;
      };
      const response = await axios.get<ReturnDataType>(
        LYRICS_ENDPOINT + `?gquery=${track.name} ${track.artist.name}`,
        { timeout: 30 * 1000 }
      );

      const { data } = response;

      if (data && typeof data === "object") {
        if (data.error_message !== "false" && data.response) {
          original_lyrics = data.response;
        }
      }
    } catch (error) {
      console.log(error);
      original_lyrics = null;
    }

    if (!original_lyrics) {
      response.text = "Couldn't parse lyrics for the song.";
      return response;
    }
    const lyrics = `**${esm(track.name)}** by **${esm(
      track.artist.name
    )}**\n\n${original_lyrics}`;
    if (lyrics.length > 6000) {
      response.text = "Couldn't find lyrics for the song.";
      return response;
    }
    const lyrics_chunks = toChunks(lyrics);
    if (!lyrics_chunks || !lyrics_chunks.length) {
      throw "toChunks() failed.";
    }
    const timestamp = moment.utc().valueOf();
    await bot.models.lyricslog.findOneAndUpdate(
      {
        track_name: track.name,
        artist_name: track.artist.name,
      },
      {
        track_name: track.name,
        artist_name: track.artist.name,
        lyrics: original_lyrics,
        timestamp,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );
    const embeds = [];
    for (const chunk of lyrics_chunks) {
      embeds.push(new EmbedBuilder().setDescription(chunk));
    }
    response.embed_components = [row];
    response.embeds = embeds;

    data.lyrics = original_lyrics;
    const final_filter_function = await generate_filter_function(data);
    response.custom_hook = final_filter_function;

    return response;
  },
};
