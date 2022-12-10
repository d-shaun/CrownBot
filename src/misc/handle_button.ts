import {
  Client,
  ButtonInteraction,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import CrownBot from "../handlers/CrownBot";
import { diffLines } from "diff";

export async function handle_button(
  bot: CrownBot,
  client: Client,
  interaction: ButtonInteraction
) {
  const embed = new EmbedBuilder().addFields([
    {
      name: "Has the bot stopped showing your now-playing song?",
      value:
        "This almost always has nothing to do with the bot but with Last.fm—unless you misspelled your username (see `/mylogin` to ensure it's correct).",
    },
    {
      name: "Things you can try",
      value:
        "Check [Last.fm status](https://twitter.com/lastfmstatus) to see if it's an issue with their servers; " +
        "if true, usually, you'll have to wait a few hours for scrobbles to catch up\n\n" +
        "(If you're using a 3rd-party Last.fm scrobbler, you're expected know how to disconnect and reconnect)\n\n" +
        "**If you use Spotify, (re)connect it to your Last.fm with these following steps:**\n" +
        "a. Login to <https://last.fm/>\n" +
        "b. Head over to <https://www.last.fm/settings/applications>\n" +
        "c. Find 'Spotify scrobbling', disconnect if it's already connected then reconnect\n" +
        "d. Go to your profile and make sure it's recording your plays correctly\n",
    },
    {
      name: "Still no luck?",
      value:
        "The [support server](https://discord.gg/zzJ5zmA) might be able to help you.",
    },
  ]);

  if (interaction.customId === "scrobblingfaq") {
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  const checkOwner = async () => {
    if (interaction.user.id === bot.owner_ID) return true;

    await interaction.reply({
      content: "Hmph, you cannot perform this action.",
      ephemeral: true,
    });
    return false;
  };
  const extractReqId = (str: string) => {
    return interaction.customId.split(str)[1];
  };

  // Accept request
  if (interaction.customId.startsWith("accept-")) {
    if (!(await checkOwner())) return;

    await interaction.message.edit({
      components: [],
    });
    const request_id = extractReqId("accept-");
    const new_lyrics = await bot.models.submittedlyrics.findOne({
      request_id,
    });

    if (!new_lyrics) {
      await interaction.reply({
        content: "No database entry found.",
        ephemeral: true,
      });
      return;
    }

    await bot.models.lyricslog.findOneAndUpdate(
      {
        track_name: new_lyrics.track_name,
        artist_name: new_lyrics.artist_name,
      },
      {
        track_name: new_lyrics.track_name,
        artist_name: new_lyrics.artist_name,
        lyrics: new_lyrics.lyrics,
        permanent: true,
      },
      {
        upsert: true,
        useFindAndModify: false,
      }
    );

    // @ts-ignore
    await new_lyrics.delete();
    await interaction.reply({
      content: `The submitted request has been accepted. (${request_id})`,
    });
  }

  // Reject request
  if (interaction.customId.startsWith("reject-")) {
    if (!(await checkOwner())) return;
    await interaction.message.edit({
      components: [],
    });
    const request_id = extractReqId("reject-");
    await bot.models.submittedlyrics.deleteOne({
      request_id,
    });
    await interaction.reply({
      content: `The submitted request has been declined. (${request_id})`,
    });
  }

  // Review request
  if (interaction.customId.startsWith("review-")) {
    if (!(await checkOwner())) return;
    const request_id = extractReqId("review-");
    const new_lyrics = await bot.models.submittedlyrics.findOne({
      request_id,
    });

    if (!new_lyrics) {
      await interaction.reply(
        "This request no longer exists on the database or has been invalidated."
      );
      return;
    }

    const saved_lyrics = await bot.models.lyricslog.findOne({
      artist_name: new_lyrics.artist_name,
      track_name: new_lyrics.track_name,
    });

    const new_attachment = new AttachmentBuilder(
      Buffer.from(new_lyrics.lyrics),
      {
        name: "New lyrics.txt",
      }
    );

    const buttonComps: ButtonBuilder[] = [
      new ButtonBuilder()
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success)
        .setCustomId("accept-" + request_id),
      new ButtonBuilder()
        .setLabel("Reject")
        .setStyle(ButtonStyle.Danger)
        .setCustomId("reject-" + request_id),
    ];
    const row = <ActionRowBuilder<ButtonBuilder>>(
      new ActionRowBuilder().addComponents(buttonComps)
    );

    if (!saved_lyrics) {
      await interaction.reply({
        content: "No existing entry on the database",
        files: [new_attachment],
        components: [row],
      });
    } else {
      const old_attachment = new AttachmentBuilder(
        Buffer.from(saved_lyrics.lyrics),
        {
          name: "Database lyrics.txt",
        }
      );
      await interaction.reply({
        content: "Reviewing lyrics submission: " + request_id,
        files: [new_attachment, old_attachment],
      });
      const changes = diffLines(saved_lyrics.lyrics, new_lyrics.lyrics, {
        newlineIsToken: true,
      });
      let str = "",
        c = 0;
      changes.forEach((diff) => {
        if (diff.added || diff.removed) {
          str += (diff.added ? "+" : "-") + diff.value + "\n";
          if (c == 1) {
            str += "...\n";
            c = 0;
          } else c++;
        }
      });
      await interaction.followUp({
        content: "Relevant diffs\n```diff\n" + str.substring(0, 2000) + "\n```",
        components: [row],
      });
    }
  }
}
