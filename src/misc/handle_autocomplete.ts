import { AutocompleteInteraction, Client } from "discord.js";
import CrownBot from "../handlers/CrownBot";

export default async function handle_autocomplete(
  bot: CrownBot,
  client: Client,
  interaction: AutocompleteInteraction
) {
  if (!interaction.guildId) return;

  const focused = interaction.options.getFocused(true);
  if (focused.name === "artist_name") {
    const server_artists = await bot.cache.artists.get(interaction.guildId);
    if (!server_artists) return;
    const choices = server_artists.artists;
    const filtered = choices.filter((choice) =>
      choice.toLowerCase().startsWith(focused.value.toLowerCase())
    );

    if (filtered.length >= 24) filtered.length = 24;

    try {
      await interaction.respond(
        filtered.map((choice) => ({ name: choice, value: choice }))
      );
    } catch {
      // too bad!!
    }
  }
}
