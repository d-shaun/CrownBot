import { MessageEmbed } from "discord.js";
import moment from "moment";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import User from "../../handlers/LastFM_components/User";
import { Spotify } from "../../handlers/Spotify";
import esm from "../../misc/escapemarkdown";
class SpotifyCommand extends Command {
  constructor() {
    super({
      name: "spotify",
      description:
        "Shows Spotify details (incl URL) for user's 'now-playing' (or explicitly specified) song.",
      usage: ["spotify", "spotify <search query>"],
      examples: ["spotify", "spotify Money Machine 100 gecs"],
      aliases: ["sp", "spt"],
      require_login: true,
      category: "other",
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const response = new BotMessage({
      client,
      message,
      reply: true,
    });
    const db = new DB(client.models);

    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;

    const lastfm_user = new User({
      username: user.username,
    });

    let search_query;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(client, message);
      if (!now_playing) return;
      search_query = `${now_playing.name} ${now_playing.artist["#text"]}`;
    } else {
      search_query = args.join(" ");
    }

    const spotify = new Spotify();
    try {
      await spotify.attach_access_token();
    } catch (e) {
      response.text =
        "Something went wrong while authenticating the Spotify API.";
      await response.send();
      return;
    }
    const track = await spotify.search_track(search_query);
    if (!track) {
      response.text = "Couldn't find the track on Spotify.";
      await response.send();
      return;
    }

    // https://github.com/moment/moment/issues/1048
    const format_duration = (ms: number) => {
      const duration = moment.duration(ms);
      if (duration.asHours() > 1) {
        return (
          Math.floor(duration.asHours()) +
          moment.utc(duration.asMilliseconds()).format(":mm:ss")
        );
      } else {
        return moment.utc(duration.asMilliseconds()).format("mm:ss");
      }
    };

    const embed = new MessageEmbed()
      .setDescription(
        `**[${esm(track.name)}](${track.external_urls.spotify})**\n\n` +
          `Artist(s): **${esm(
            track.artists.map((artist) => artist.name).join(", ")
          )}**\n` +
          `Album: **${esm(track.album.name)}**\n` +
          `Duration: **${format_duration(track.duration_ms)}**`
      )
      .setColor(message.member?.displayColor || "000000")
      .setThumbnail(track.album.images[0].url)
      .setAuthor("Track details on Spotify");

    await message.channel.send(track.external_urls.spotify, embed);
  }
}

export default SpotifyCommand;
