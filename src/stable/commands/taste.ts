import { MessageEmbed } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import User from "../../handlers/LastFM_components/User";
import { UserTopArtist } from "../../interfaces/ArtistInterface";
import esm from "../../misc/escapemarkdown";
import search_user from "../../misc/search_user";

class TasteCommand extends Command {
  constructor() {
    super({
      name: "taste",
      description: "Compares same-artist plays between two users.",
      usage: ["taste <username>", "taste @user"],
      aliases: ["t"],
      require_login: true,
      category: "userstat",
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    const response = new BotMessage({
      bot,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(bot.models);
    const mentioned = message.mentions.members?.first();
    let user_two = mentioned ? mentioned.user : undefined;

    if (!user_two && args.length !== 0) {
      user_two = await search_user(message, args);
    }
    if (!user_two) {
      response.text =
        "User not found; try mentioning the user instead (`@username`).";
      await response.send();
      return;
    }

    const u1 = await db.fetch_user(message.guild.id, message.author.id);
    const u2 = await db.fetch_user(message.guild.id, user_two.id);
    if (!(u1 && u2)) {
      response.text =
        "The user hasn't registered their Last.fm username on the bot.";
      await response.send();
      return;
    }

    const responses: UserTopArtist["topartists"]["artist"][] = [];

    for (const user of [u1, u2]) {
      const lastfm_user = new User({
        username: user.username,
        limit: 200,
      });
      const query = await lastfm_user.get_top_artists({
        period: "overall",
      });
      if (query.lastfm_errorcode || !query.success) {
        response.error("lastfm_error", query.lastfm_errormessage);
        return;
      }
      responses.push(query.data.topartists.artist);
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
      const cur_diff = Math.abs(b.userone_plays - b.usertwo_plays);
      const then_diff = Math.abs(a.userone_plays - a.usertwo_plays);
      return then_diff - cur_diff;
    });
    if (plays.length > 25) plays.length = 25;

    const embed = new MessageEmbed().setTitle(
      `\`\`${message.author.username}\`\`'s and \`\`${user_two.username}\`\`'s taste comparison `
    );
    plays.forEach((stat) => {
      const { name, userone_plays, usertwo_plays } = stat;
      embed.addField(
        esm(name),
        `${userone_plays} plays — ${usertwo_plays} plays`,
        true
      );
    });

    await message.channel.send({ embeds: [embed] });
  }
}

export default TasteCommand;
