import {
  Client,
  EmbedBuilder,
  ModalSubmitInteraction,
  TextChannel,
} from "discord.js";
import CrownBot from "../handlers/CrownBot";

export async function handle_reportbug(
  bot: CrownBot,
  client: Client,
  interaction: ModalSubmitInteraction
) {
  const message = interaction.fields.getTextInputValue("message");

  const data = {
    user: interaction.user.tag,
    userID: interaction.user.id,
    guildID: interaction.guildId,
    message,
    timestamp: new Date().toUTCString(),
  };
  // @ts-ignore
  await new bot.models.reportbug({ ...data }).save();

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

export async function handle_editconfig(
  bot: CrownBot,
  client: Client,
  interaction: ModalSubmitInteraction
) {
  const exception_log_channel = interaction.fields.getTextInputValue(
    "exception_log_channel"
  );
  const maintenance = interaction.fields.getTextInputValue("maintenance");
  const disabled = interaction.fields.getTextInputValue("disabled");
  const disabled_message =
    interaction.fields.getTextInputValue("disabled_message");

  let extra = "Currently cached configs have been updated.";
  await bot.models.botconfig.findOneAndUpdate(
    {},
    { exception_log_channel, maintenance, disabled, disabled_message },
    { useFindAndModify: false }
  );
  if (bot.botconfig) {
    bot.botconfig.exception_log_channel = exception_log_channel;
    bot.botconfig.maintenance = maintenance;
    bot.botconfig.disabled = disabled;
    bot.botconfig.disabled_message = disabled_message;
  } else extra = "Failed to update the currently cached configs.";

  await interaction.reply("BotConfig has been updated. " + extra);
  return;
}
