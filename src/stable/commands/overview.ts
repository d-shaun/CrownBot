import { Message, MessageEmbed, User } from "discord.js";
import Command from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import BotMessage from "../../handlers/BotMessage";
import LastFMUser from "../../handlers/LastFMUser";
import { LastFM } from "../../handlers/LastFM";
import { Template } from "../../classes/Template";
import { ArtistInterface } from "../../interfaces/ArtistInterface";

class OverviewCommand extends Command {
  constructor() {
    super({
      name: "overview",
      description: "Displays user's scrobble overview for an artist.",
      usage: [
        "overview",
        "overview <artist name>",
        "overview <artist name> @user",
      ],
      aliases: ["o", "ov"],
      examples: ["overview Devin Townsend", "overview Joy Division @user"],
      require_login: true,
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const db = new DB(client.models);
    const response = new BotMessage({ client, message, text: "", reply: true });
    let discord_user: User;
    let [last_item] = args.slice(-1);
    let user;
    if (last_item && last_item.startsWith("<@") && last_item.endsWith(">")) {
      last_item = last_item.slice(2, -1);
      if (last_item.startsWith("!")) {
        last_item = last_item.slice(1);
      }
      const mention = message.guild?.members.cache.get(last_item);
      if (!mention) {
        response.text = "Couldn't find the mentioned user in this server.";
        response.send();
        return;
      }
      discord_user = mention.user;
      user = await db.fetch_user(message.guild?.id, mention.user.id);
      if (!user) {
        response.text = "The mentioned user isn't logged into the bot.";
        response.send();
        return;
      }
      args.pop();
    } else {
      discord_user = message.author;
      user = await db.fetch_user(message.guild?.id, message.author.id);
    }
    if (!user) return;
    const lastfm_user = new LastFMUser({
      discord_ID: user.user_ID,
      username: user.username,
    });
    const author_db_user = await db.fetch_user(
      message.guild?.id,
      message.author.id
    );
    if (!author_db_user) return;
    const author_user = new LastFMUser({
      username: author_db_user.username,
      discord_ID: author_db_user.user_ID,
    });

    let artist_name;
    if (args.length === 0) {
      const now_playing = await author_user.get_nowplaying(client, message);
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
      response.text = `${discord_user.username} hasn't scrobbled \`${artist.name}\`.`;
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

    const has_crown = await client.models.crowns.findOne({
      artistName: artist.name,
      guildID: message.guild?.id,
    });

    const embed = new MessageEmbed()
      .setTitle(`\`${artist.name}\` overview for ${discord_user.username}`)
      .addField(
        "Scrobbles",
        `${has_crown ? ":crown:" : ""} **${
          artist.stats.userplaycount
        }** plays—**${albums.length}** albums · **${tracks.length}** tracks`,
        false
      );

    if (album_str.length) {
      embed.addField("Top albums", album_str.join("\n"), true);
    }
    if (track_str.length) {
      embed.addField("Top tracks", track_str.join("\n"), true);
    }

    await message.channel.send(embed);
  }
}

export default OverviewCommand;
