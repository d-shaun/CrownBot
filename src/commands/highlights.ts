import { Client, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import esm from "../misc/escapemarkdown";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("highlights")
    .setDescription("See your weekly highlights"),
  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    const discord_user = interaction.user;

    /*

    const lastfm_user = new User({
      username: "cogwizard",
    });

    const query = await lastfm_user.get_top_artists({
      period: "7day",
    });
    console.log(query.data.topartists.artist);
    const temp = query.data.topartists.artist;
    const spotify = new Spotify();
    await spotify.attach_access_token();
    const map = temp.map((elem) => {
      return {
        name: elem.name,
        playcount: elem.playcount,
      };
    });
    const datum = await spotify.attach_artist_images(map);
    const stats = await lastfm_user.get_alltime_listening_history();

    const today = new Date();
    const one_week_ago = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - 7,
        today.getUTCHours(),
        today.getUTCMinutes(),
        today.getUTCSeconds()
      )
    );

    const utc_unix = Math.floor(one_week_ago.getTime() / 1000);

    console.log(utc_unix);
    lastfm_user.configs.limit = 190;
    const recents = await lastfm_user.get_recenttracks({
      from: utc_unix,
      extended: 1,
    });
    const datapoints = recents.data.recenttracks.track.map(
      (track) => track.date.uts
    );
    debugger;
    return;
    */

    response.text = "werking";
    return response;
  },
};
