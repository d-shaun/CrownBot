import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  ComponentType,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import moment from "moment";
import GuildChatInteraction from "../../classes/GuildChatInteraction";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import Track from "../../handlers/LastFM_components/Track";
import User from "../../handlers/LastFM_components/User";
import { ExtractModelType } from "../../models/DBModels";

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

  const collector =
    interaction.channel.createMessageComponentCollector<ComponentType.Button>({
      filter,
      time: 120000,
    });

  collector.on("collect", async (i) => {
    if (i.customId === random_id) {
      await show_modal(i, db_entry);
    }
  });
}

async function show_modal(
  interaction: ButtonInteraction,
  db_entry: ExtractModelType<"lyricslog">
) {
  const modal = new ModalBuilder()
    .setCustomId("lyricsmodal")
    .setTitle("Edit lyrics");

  const track_input = new TextInputBuilder()
    .setCustomId("new_track")
    .setLabel("Track name")
    .setRequired(true)
    .setStyle(TextInputStyle.Short)
    .setValue(db_entry.track_name);

  const artist_input = new TextInputBuilder()
    .setCustomId("new_artist")
    .setLabel("Artist name")
    .setRequired(true)
    .setStyle(TextInputStyle.Short)
    .setValue(db_entry.artist_name);

  const permanent_input = new TextInputBuilder()
    .setCustomId("new_permanent")
    .setLabel("Permanent?")
    .setRequired(true)
    .setStyle(TextInputStyle.Short)
    .setValue(db_entry.permanent ? "true" : "false");

  const lyrics_input = new TextInputBuilder()
    .setCustomId("new_lyrics")
    .setLabel("Lyrics")
    .setRequired(true)
    .setStyle(TextInputStyle.Paragraph)
    .setValue(db_entry.lyrics);

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

  modal.addComponents(first, second, third, fourth);
  await interaction.showModal(modal);
}

export async function handle_editlyrics(
  bot: CrownBot,
  client: Client,
  interaction: ModalSubmitInteraction
) {
  const track_name = interaction.fields.getTextInputValue("new_track");
  const artist_name = interaction.fields.getTextInputValue("new_artist");
  const permanent = interaction.fields.getTextInputValue("new_permanent");
  const lyrics = interaction.fields.getTextInputValue("new_lyrics");

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
  await interaction.reply("The entry has been updated");
  return;
}
