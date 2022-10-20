import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { Template } from "../classes/Template";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import Album from "../handlers/LastFM_components/Album";
import User from "../handlers/LastFM_components/User";
import Paginate from "../handlers/Paginate";
import { LeaderboardInterface } from "../interfaces/LeaderboardInterface";
import cb from "../misc/codeblock";
import esm from "../misc/escapemarkdown";
import get_registered_users from "../misc/get_registered_users";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("whoknowsalbum")
    .setDescription("Lists users who listen to a certain album.")
    .addStringOption((option) =>
      option
        .setName("album_name")
        .setDescription("Album name (defaults to now-playing)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("artist_name")
        .setDescription("The artist's name")
        .setRequired(false)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction
  ) {
    const response = new BotMessage({
      bot,
      interaction,
    });

    const db = new DB(bot.models);
    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (!user) return;
    const lastfm_user = new User({
      username: user.username,
    });

    let album_name = interaction.options.getString("album_name");
    let artist_name = interaction.options.getString("artist_name");

    if (!album_name) {
      const now_playing = await lastfm_user.get_nowplaying(bot, interaction);
      if (!now_playing) return;
      album_name = now_playing.album["#text"];
      artist_name = now_playing.artist["#text"];
    }

    if (!artist_name) {
      const query = await new Album({
        name: album_name,
        limit: 1,
      }).search();

      if (query.lastfm_errorcode || !query.success) {
        response.error("lastfm_error", query.lastfm_errormessage);
        return;
      }

      const album = query.data.results.albummatches.album[0];
      if (!album) {
        response.text = `Couldn't find the album.`;
        await response.send();
        return;
      }
      album_name = album.name;
      artist_name = album.artist;
    }

    const query = await new Album({
      name: album_name,
      artist_name,
      username: user.username,
    }).user_get_info();
    if (query.lastfm_errorcode || !query.success) {
      response.error("lastfm_error", query.lastfm_errormessage);
      return;
    }
    const album = query.data.album;
    const users = (await get_registered_users(bot, interaction))?.users;
    if (!users || users.length <= 0) {
      response.text = `No user on this server has registered their Last.fm username; use the ${cb(
        "/login"
      )} command.`;
      await response.send();
      return;
    }

    if (users.length > bot.max_users) {
      users.length = bot.max_users;
    }
    const lastfm_requests = [];

    for await (const user of users) {
      const context = {
        discord_user: user.discord,
        lastfm_username: user.database.username,
      };
      lastfm_requests.push(
        new Album({
          name: album_name,
          artist_name,
          username: user.database.username,
        })
          .user_get_info()
          .then((res) => {
            const response_with_context = {
              wrapper: res,
              context,
            };
            return response_with_context;
          })
      );
    }
    let responses = await Promise.all(lastfm_requests);

    if (
      !responses.length ||
      responses.some((response) => !response.wrapper.data?.album?.playcount)
    ) {
      response.text = new Template().get("lastfm_error");
      await response.send();
      return;
    }

    responses = responses.filter((response) => response.wrapper.success);
    let leaderboard: LeaderboardInterface[] = [];

    responses.forEach((response) => {
      const album = response.wrapper.data.album;
      const context = response.context;
      if (!context || !context.discord_user) return;
      if (album.userplaycount === undefined) return;
      if (parseInt(album.userplaycount) <= 0) return;
      leaderboard.push({
        album_name: album.name,
        artist_name: album.artist,
        discord_username: context.discord_user?.user.username,
        lastfm_username: context.lastfm_username,
        userplaycount: album.userplaycount,
        user_id: context.discord_user.user.id,
        user_tag: context.discord_user.user.tag,
        guild_id: interaction.guild.id,
      });
    });
    if (leaderboard.length <= 0) {
      response.text = `No one here has played ${cb(album.name)} by ${cb(
        album.artist
      )}.`;
      await response.send();
      return;
    }

    leaderboard = leaderboard.sort(
      (a, b) => parseInt(b.userplaycount) - parseInt(a.userplaycount)
    );
    const total_scrobbles = leaderboard.reduce(
      (a, b) => a + parseInt(b.userplaycount),
      0
    );

    const embed = new EmbedBuilder()
      .setTitle(`Who knows the album ${cb(album.name)}?`)
      .setFooter({ text: `"${esm(album.name)}" by ${esm(album.artist)}` });

    if (leaderboard.length >= 2) {
      embed.setDescription(
        `**${total_scrobbles}** plays ― **${leaderboard.length}** listener(s)`
      );
    }
    const data_list = leaderboard.map((elem) => {
      return `${elem.discord_username} — **${elem.userplaycount} play(s)**`;
    });

    const paginate = new Paginate(interaction, embed, data_list);
    await paginate.send();
  },
};
