import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
} from "discord.js";
import moment from "moment";
import GuildChatInteraction from "../../classes/GuildChatInteraction";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import Track from "../../handlers/LastFM_components/Track";
import User from "../../handlers/LastFM_components/User";
import generate_random_strings from "../../misc/generate_random_strings";

export default async function edit_lyrics(
  bot: CrownBot,
  interaction: GuildChatInteraction
) {
  const db = new DB(bot.models);
  const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
  if (!user) return;
  const lastfm_user = new User({
    username: user.username,
  });

  let track_name = interaction.options.getString("track_name");
  let artist_name = interaction.options.getString("artist_name");

  if (!track_name) {
    const now_playing = await lastfm_user.get_nowplaying(bot, interaction);
    if (!now_playing) return;
    track_name = now_playing.name;
    artist_name = now_playing.artist["#text"];
  }
  if (!artist_name) {
    const query = await new Track({
      name: track_name,
      limit: 1,
    }).search();

    if (query.lastfm_errorcode || !query.success) {
      await interaction.editReply({
        content: "Lastfm error " + query.lastfm_errormessage,
      });
      return;
    }

    const track = query.data.results.trackmatches.track.shift();

    if (!track) {
      await interaction.editReply({
        content: "Couldn't find the track",
      });
      return;
    }
    track_name = track.name;
    artist_name = track.artist;
  }

  const query = await new Track({
    name: track_name,
    artist_name,
  }).get_info();

  if (query.lastfm_errorcode || !query.success) {
    return;
  }
  const track = query.data.track;

  const db_entry = await bot.models.lyricslog.findOne({
    track_name: track.name,
    artist_name: track.artist.name,
  });
  if (!db_entry) {
    await interaction.editReply({
      content: "No entry on the database",
    });
    return;
  }
  const random_id =
    "edt" + (Math.random().toString(36) + "00000000000000000").slice(2, 7 + 2);
  const row = <ActionRowBuilder<ButtonBuilder>>(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(random_id)
        .setLabel("Edit lyrics")
        .setStyle(ButtonStyle.Primary)
    )
  );

  await interaction.editReply({
    content: `Track: ${db_entry.track_name}\nArtist: ${db_entry.artist_name}\nPermanent: ${db_entry.permanent}`,
    components: [row],
  });

  const filter = (i: ButtonInteraction) =>
    i.user.id === interaction.user.id && i.customId === random_id;

  const collector = interaction.channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter,
    time: 120000,
  });

  bot.cache.collectors.add(collector);

  collector.on("collect", async (i) => {
    if (i.customId === random_id) {
      await show_modal(bot, i, db_entry);
    }
  });
}

export type LyricsData = {
  track_name: string;
  artist_name: string;
  lyrics?: string;
  permanent?: boolean;
};

export async function show_modal(
  bot: CrownBot,
  interaction: ButtonInteraction,
  entry_data: LyricsData,
  is_admin = false
) {
  const random_id = generate_random_strings(8);

  if (entry_data.lyrics && entry_data.lyrics?.length >= 3950) {
    await interaction.reply({
      content:
        "The lyrics for this track is too large for the Discord Modal to support. Contact bot support to make changes to the lyrics (see `/about`).",
      ephemeral: true,
    });
    return;
  }
  const modal = new ModalBuilder()
    .setCustomId("newlyricsmodal")
    .setTitle("Edit lyrics");

  const track_input = new TextInputBuilder()
    .setCustomId("new_track")
    .setLabel("Track name")
    .setRequired(true)
    .setStyle(TextInputStyle.Short)
    .setValue(entry_data.track_name);

  const artist_input = new TextInputBuilder()
    .setCustomId("new_artist")
    .setLabel("Artist name")
    .setRequired(true)
    .setStyle(TextInputStyle.Short)
    .setValue(entry_data.artist_name);

  const permanent_input = new TextInputBuilder()
    .setCustomId("new_permanent")
    .setLabel("Permanent?")
    .setRequired(true)
    .setStyle(TextInputStyle.Short)
    .setValue(entry_data.permanent ? "true" : "false");

  const lyrics_input = new TextInputBuilder()
    .setCustomId("new_lyrics")
    .setLabel("New lyrics")
    .setRequired(true)
    .setStyle(TextInputStyle.Paragraph)
    .setValue(entry_data.lyrics || "");

  const first = new ActionRowBuilder<TextInputBuilder>().addComponents(
    track_input
  );
  const second = new ActionRowBuilder<TextInputBuilder>().addComponents(
    artist_input
  );
  const third = new ActionRowBuilder<TextInputBuilder>().addComponents(
    permanent_input
  );
  const fourth = new ActionRowBuilder<TextInputBuilder>().addComponents(
    lyrics_input
  );

  if (is_admin) modal.addComponents(first, second, third, fourth);
  else modal.addComponents(fourth);
  await interaction.showModal(modal);
  // Get the Modal Submit Interaction that is emitted once the User submits the Modal
  const submitted = await interaction
    .awaitModalSubmit({
      time: 60000,
    })
    .catch(() => {
      return null;
    });
  if (submitted) {
    // const track_name = submitted.fields.getTextInputValue("new_track");
    // const artist_name = submitted.fields.getTextInputValue("new_artist");
    // const permanent = submitted.fields.getTextInputValue("new_permanent");
    const lyrics = submitted.fields.getTextInputValue("new_lyrics");
    const timestamp = moment.utc().valueOf();

    if (!lyrics) return;

    const data = {
      request_id: random_id,
      user_tag: submitted.user.tag,
      user_id: submitted.user.id,
    };
    if (is_admin) {
      const track_name = submitted.fields.getTextInputValue("new_track");
      const artist_name = submitted.fields.getTextInputValue("new_artist");
      const permanent = submitted.fields.getTextInputValue("new_permanent");
      const lyrics = submitted.fields.getTextInputValue("new_lyrics");

      const timestamp = moment.utc().valueOf();

      await bot.models.lyricslog.findOneAndUpdate(
        {
          track_name: track_name,
          artist_name: artist_name,
        },
        {
          track_name: track_name,
          artist_name: artist_name,
          lyrics: lyrics,
          permanent: permanent === "true" ? true : false,
          timestamp,
        },
        {
          upsert: true,
          useFindAndModify: false,
        }
      );

      const admin_embed = new EmbedBuilder()
        .setTitle("Lyrics updated")
        .setDescription(
          interaction.user.toString() + ": The lyrics entry has been updated."
        );
      await submitted.reply({
        embeds: [admin_embed],
      });

      return;
    }

    // normal user
    await bot.models.submittedlyrics.create({
      ...data,
      track_name: entry_data.track_name,
      artist_name: entry_data.artist_name,
      lyrics: lyrics,
      timestamp,
    });
    const user_embed = new EmbedBuilder()
      .setTitle("Lyrics submitted")
      .setDescription(
        interaction.user.toString() +
          ": Your new lyrics have been submitted and it is **currently under review**. Please check back later for your changes to show up. Thank you!"
      );
    await submitted.reply({
      embeds: [user_embed],
    });

    const channel = await bot.get_log_channel(interaction.client);

    if (!channel) {
      console.log("Cannot find the logging channel (exception_log_channel).");
      return;
    }

    const log_embed = new EmbedBuilder()
      .setTitle("New lyrics submission")
      .addFields([
        { name: "Request ID", value: random_id, inline: false },
        { name: "User tag", value: data.user_tag, inline: false },
        { name: "Track name", value: entry_data.track_name, inline: false },
        { name: "Artist name", value: entry_data.artist_name, inline: false },

        { name: "Timestamp", value: new Date().toUTCString(), inline: false },
      ]);

    const buttonComps: ButtonBuilder[] = [
      new ButtonBuilder()
        .setLabel("🔍 Review")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("review-" + random_id),
    ];
    const row = <ActionRowBuilder<ButtonBuilder>>(
      new ActionRowBuilder().addComponents(buttonComps)
    );
    if (channel.type == ChannelType.GuildStageVoice) return;
    await channel.send({ embeds: [log_embed], components: [row] });
  }
}
