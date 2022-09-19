import {
  Client,
  ModalSubmitInteraction,
  TextChannel,
  EmbedBuilder,
} from "discord.js";
import CrownBot from "../handlers/CrownBot";

export default async function handle_bugreport(
  bot: CrownBot,
  client: Client,
  interaction: ModalSubmitInteraction
) {
  if (interaction.customId !== "bugmodal") return;
  const message = interaction.fields.getTextInputValue("message");

  const data = {
    user: interaction.user.tag,
    userID: interaction.user.id,
    guilID: interaction.guildId,
    message,
    timestamp: new Date().toUTCString(),
  };
  await new bot.models.bugreport({ ...data }).save();

  // check if exception_log_channel is set
  const config = await bot.models.botconfig.findOne();
  if (!config || !config.exception_log_channel) return;

  const channel = <TextChannel | undefined>(
    client.channels.cache.get(config.exception_log_channel)
  );

  if (!channel) {
    console.log(
      "Cannot find the channel `" +
        config.exception_log_channel +
        "` set in exception_log_channel."
    );
    return;
  }

  const embed = new EmbedBuilder().setTitle("Bug report").addFields([
    { name: "User", value: data.user, inline: true },
    {
      name: "Timestamp",
      value: data.timestamp,
      inline: false,
    },
    {
      name: "Message",
      value: "```" + data.message + "```",
      inline: false,
    },
  ]);

  await channel.send({ embeds: [embed] });

  await interaction.reply("Bug report has been submitted. Thank you!");
}
