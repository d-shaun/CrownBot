import { Message, MessageEmbed } from "discord.js";
import Command from "../classes/Command";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import { LastFM } from "../handlers/LastFM";
import LastFMUser from "../handlers/LastFMUser";
import { ArtistInterface } from "../interfaces/ArtistInterface";
class OverviewCommand extends Command {
  constructor() {
    super({
      name: "overview",
      description: "Displays user's scrobble overview for an artist.",
      usage: ["overview", "overview <artist name>"],
      aliases: ["o", "ov"],
      examples: ["overview Devin Townsend", "overview Joy Division"],
      require_login: true,
    });
  }

  async run(client: CrownBot, message: Message, args: String[]) {
    const db = new DB(client.models);
    const user = await db.fetch_user(message.author.id);
    const response = new BotMessage({ client, message, text: "", reply: true });

    if (!user) return;

    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    let artist_name;
    if (args.length === 0) {
      const now_playing = await lastfm_user.get_nowplaying(client, message);
      if (!now_playing) return;
      artist_name = now_playing.artist["#text"];
    } else {
      artist_name = args.join(" ");
    }
    const { status, data } = await new LastFM().query({
      method: "artist.getinfo",
      params: {
        artist: artist_name,
        username: user.username,
        autocorrect: 1,
      },
    });

    if (data.error === 6) {
      response.text = "Artist not found.";
      response.send();
      return;
    } else if (status !== 200 || !data.artist) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    const artist: ArtistInterface = data.artist;
    if (!artist.stats.userplaycount) return;
    if (parseInt(artist.stats.userplaycount) <= 0) {
      response.text = `You haven't scrobbled \`${artist.name}\`.`;
      await response.send();
      return;
    }
    const albums = await lastfm_user.get_albums(artist.name);
    const tracks = await lastfm_user.get_tracks(artist.name);

    if (!albums || !tracks) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }
    const album_str = albums.slice(0, 15).map((album, i) => {
      return `${i + 1}. **${album.name}** (${album.plays})`;
    });

    const track_str = tracks.slice(0, 15).map((track, i) => {
      return `${i + 1}. **${track.name}** (${track.plays})`;
    });
    const embed = new MessageEmbed()
      .setTitle(`\`${artist.name}\` overview for ${message.author.username}`)
      .addField(
        "Scrobbles",
        `**${artist.stats.userplaycount}** plays—**${albums.length}** albums · **${tracks.length}** tracks`,
        false
      )
      .addField("Top albums", album_str.join("\n"), true)
      .addField("Top tracks", track_str.join("\n"), true);
    await message.channel.send(embed);
  }
}

export default OverviewCommand;
