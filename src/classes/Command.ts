import { Client, EmbedBuilder, TextChannel } from "discord.js";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import check_ban from "../misc/check_ban";
import cb from "../misc/codeblock";
import generate_random_strings from "../misc/generate_random_strings";
import GuildChatInteraction from "./GuildChatInteraction";
import { Template } from "./Template";

export async function preflight_checks(
  bot: CrownBot,
  client: Client,
  interaction: GuildChatInteraction,
  command: any
) {
  try {
    const exception_for_defer = ["bugreport"];

    if (!exception_for_defer.includes(interaction.commandName))
      await interaction.deferReply();

    const db = new DB(bot.models);
    const response = new BotMessage({ bot, interaction });

    if (bot.botconfig?.maintenance === "on") {
      response.text =
        "The bot is currently under maintenance; please try again in a while.";
      if (interaction.user.id !== bot.owner_ID) {
        await response.send();
        return;
      }
    }

    const ban_info = await check_ban(interaction, bot);
    if (ban_info.banned && interaction.user.id !== bot.owner_ID) {
      if (ban_info.type === "global") {
        response.text =
          "You are globally banned from accessing the bot; try `&about` to find the support server.";
        await response.send();
        return;
      }
      if (ban_info.type === "local") {
        if (interaction.commandName !== "unban") {
          response.text =
            "You are banned from accessing the bot on this server.";
          await response.send();
          return;
        }
      }
    }

    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (interaction.commandName !== "login" && !user) {
      response.text = new Template().get("not_logged");

      // temporary message for the &snap'ed users
      if (await db.check_snap(interaction.guild.id, interaction.user.id)) {
        response.text =
          "You have been logged out of the bot on this server because **you have crown(s) registered under multiple Last.fm usernames**.\n\n" +
          "Please login again with your primary username: `&login <lastfm username>`\n\n[Click here to learn more about this change](https://github.com/d-shaun/CrownBot/issues/40) ";
      }

      await response.send();
      return;
    }

    if (command) await command.execute(bot, client, interaction);
  } catch (e: any) {
    await log_error(client, bot, interaction, e.stack || e);
    console.log("Uncaught exception at pre-flight checks");
    console.log(e);
  }
}

async function log_error(
  client: Client,
  bot: CrownBot,
  interaction: GuildChatInteraction,
  stack?: string
) {
  const response = new BotMessage({ bot, interaction });

  const expire_date = new Date();
  expire_date.setDate(expire_date.getDate() + 28); // add 28 days to current date
  const incident_id = generate_random_strings(8);
  const data = {
    expireAt: expire_date,
    incident_id,
    command_name: interaction.commandName,
    message_content: interaction.options.data.toString(),
    user_ID: interaction.user.id,
    guild_ID: interaction.guild.id,
    timestamp: `${new Date().toUTCString()}`,
    stack: `${stack || `none`}`,
  };
  if (stack) {
    await new bot.models.errorlogs({ ...data }).save();
    response.text =
      `The bot has encountered an unexpected error while executing your request; ` +
      `please consider reporting this incident (id: ${cb(
        incident_id
      )}) to the bot's support server—see ${cb("/about")}.`;
    await response.send();
  }

  // attempt to send logs to the channel specified in "exception_log_channel" (/src/models/BotConfig.ts)
  try {
    await send_exception_log(client, bot, interaction, incident_id, stack);
  } catch (e) {
    // supress any error to avoid infinite error loop

    console.error(
      "Supressed an exception to prevent a throw-catch loop; please check the relevant log below."
    );

    console.log(e);
  }
}

/**
 * Sends exception log to the channel specified in `config.exception_log_channel` along with
 * the incident ID and error stack.
 * @param client
 * @param incident_id
 * @param stack
 */
async function send_exception_log(
  client: Client,
  bot: CrownBot,
  interaction: GuildChatInteraction,
  incident_id: string,
  stack?: string
) {
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

  const embed = new EmbedBuilder().setTitle("Uncaught exception").addFields([
    { name: "Incident ID", value: incident_id, inline: false },
    { name: "Command name", value: interaction.commandName, inline: true },
    { name: "Timestamp", value: new Date().toUTCString(), inline: true },
    {
      name: "Error",
      value: stack ? "```JS\n" + stack.split("\n").shift() + "\n```" : "Empty",
    },
  ]);

  await channel.send({ embeds: [embed] });
}
