import { Message, MessageAttachment } from "discord.js";
import moment from "moment";
import { GuildMessage } from "../../../classes/Command";
import BotMessage from "../../../handlers/BotMessage";
import CrownBot from "../../../handlers/CrownBot";
import DB from "../../../handlers/DB";
import Track from "../../../handlers/LastFM_components/Track";
import User from "../../../handlers/LastFM_components/User";
import { LyricsLogInterface } from "../../models/LyricsLog";

export default class LyricsCommand {
  name = "lyrics";
  description = "Manage custom, permanent lyrics";

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    // const server_prefix = bot.cache.prefix.get(message.guild);
    const db = new DB(bot.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;

    const response = new BotMessage({ bot, message, text: "", reply: true });
    const lastfm_user = new User({
      username: user.username,
    });

    let artist_name;
    let track_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(bot, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
      track_name = now_playing.name;
    } else {
      const str = args.join(" ");
      const str_array = str.split("||");
      if (str_array.length !== 2) {
        const query = await new Track({
          name: str_array.join().trim(),
          limit: 1,
        }).search();
        if (query.lastfm_errorcode || !query.success) {
          response.error("lastfm_error", query.lastfm_errormessage);
          return;
        }
        const track = query.data.results.trackmatches.track.shift();

        if (!track) {
          response.text = `Couldn't find the track; try providing artist name.`;
          await response.send();
          return;
        }
        track_name = track.name;
        artist_name = track.artist;
      } else {
        track_name = str_array[0].trim();
        artist_name = str_array[1].trim();
      }
    }

    const query = await new Track({
      name: track_name,
      artist_name,
    }).get_info();
    if (query.lastfm_errorcode || !query.success) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }
    const track = query.data.track;

    const db_entry: LyricsLogInterface = await bot.models.lyricslog.findOne(<
      LyricsLogInterface
    >{
      track_name: track.name,
      artist_name: track.artist.name,
    });

    if (db_entry) {
      const attachment = new MessageAttachment(
        Buffer.from(db_entry.lyrics, "utf-8"),
        "lyrics.txt"
      );
      await message.reply({
        content: `Current lyrics\nPermanent: ${db_entry.permanent}\nTimestamp: ${db_entry.timestamp}`,
        files: [attachment],
      });
    }

    response.text =
      "Send new lyrics for **" +
      track.name +
      "** by **" +
      track.artist.name +
      "**";
    await response.send();

    const filter = (m: Message) => m.author.id === message.author.id;
    const collector = message.channel.createMessageCollector({
      filter,
      time: 300000,
      max: 30,
    });
    let resume = true;
    const new_lyrics: string[] = [];
    collector.on("collect", async (m) => {
      if (!resume) return;
      console.log(m);
      if (m.content === "cancel") {
        resume = false;
        await m.reply("The process has been aborted");

        return;
      }
      if (m.content === "done") {
        resume = false;
        const timestamp = moment.utc().valueOf();

        await bot.models.lyricslog.findOneAndUpdate(
          {
            track_name: track.name,
            artist_name: track.artist.name,
          },
          <LyricsLogInterface>{
            track_name: track.name,
            artist_name: track.artist.name,
            lyrics: new_lyrics.join("\n"),
            permanent: true,
            timestamp,
          },
          {
            upsert: true,
            useFindAndModify: false,
          }
        );
        await m.reply("The entry has been updated");
        return;
      }
      const cleaned = m.content.replace(/^[`]{2,4}$/gm, "").trim();
      new_lyrics.push(cleaned);
    });
  }
}
