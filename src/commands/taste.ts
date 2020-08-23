import { Message, MessageEmbed } from "discord.js";
import Command from "../classes/Command";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import LastFMUser from "../handlers/LastFMUser";
import { TopArtistInterface } from "../interfaces/ArtistInterface";
import search_user from "../misc/search_user";
class TasteCommand extends Command {
  constructor() {
    super({
      name: "taste",
      description: "Compares same-artist plays between two users.",
      usage: ["taste <username>", "taste @user"],
      aliases: ["t"],
      require_login: true,
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);
    let mentioned = message.mentions.members?.first();
    let user_two = mentioned ? mentioned.user : undefined;

    if (!user_two && args.length !== 0) {
      user_two = search_user(message, args);
    }
    if (!user_two) {
      response.text =
        "User not found; try mentioning the user instead (`@username`).";
      await response.send();
      return;
    }

    const u1 = await db.fetch_user(message.guild?.id, message.author.id);
    const u2 = await db.fetch_user(message.guild?.id, user_two.id);
    if (!(u1 && u2)) {
      response.text =
        "The user hasn't registered their Last.fm username on the bot.";
      await response.send();
      return;
    }

    const responses: TopArtistInterface[][] = [];

    for (const user of [u1, u2]) {
      const lastfm_user = new LastFMUser({
        discord_ID: message.author.id,
        username: user.username,
      });
      const query = await lastfm_user.get_top_artists({
        limit: 200,
        period: "overall",
      });
      responses.push(query.topartists.artist);
    }

    let plays: {
      name: string;
      userone_plays: number;
      usertwo_plays: number;
    }[] = [];
    const similar_artists = responses[0].filter((artist) => {
      return responses[1].find((ar) => ar.name === artist.name);
    });
    similar_artists.forEach((artist) => {
      const usertwo_artist = responses[1].find((ar) => ar.name === artist.name);
      if (!usertwo_artist) return;
      plays.push({
        name: artist.name,
        userone_plays: parseInt(artist.playcount),
        usertwo_plays: parseInt(usertwo_artist.playcount),
      });
    });

    plays = plays.sort((a, b) => {
      let cur_diff = Math.abs(b.userone_plays - b.usertwo_plays);
      let then_diff = Math.abs(a.userone_plays - a.usertwo_plays);
      return then_diff - cur_diff;
    });
    if (plays.length > 25) plays.length = 25;

    const embed = new MessageEmbed().setTitle(
      `\`\`${message.author.username}\`\`'s and \`\`${user_two.username}\`\`'s taste comparision `
    );
    plays.forEach((stat) => {
      const { name, userone_plays, usertwo_plays } = stat;
      embed.addField(
        name,
        `${userone_plays} plays — ${usertwo_plays} plays`,
        true
      );
    });

    await message.channel.send(embed);
  }
}

export default TasteCommand;
