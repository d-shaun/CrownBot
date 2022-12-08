import { Client, EmbedBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { Template } from "../classes/Template";
import check_ban from "../misc/check_ban";
import cb from "../misc/codeblock";
import generate_random_strings from "../misc/generate_random_strings";
import BotMessage from "./BotMessage";
import { CommandResponse } from "./CommandResponse";
import CrownBot from "./CrownBot";
import DB from "./DB";

export async function preflight_checks(
  bot: CrownBot,
  client: Client,
  interaction: GuildChatInteraction,
  command: any,
  response: CommandResponse
) {
  try {
    const exception_for_defer = ["reportbug", "managebot"];

    if (
      !exception_for_defer.includes(interaction.commandName) &&
      !interaction.deferred
    )
      await interaction.deferReply();

    const db = new DB(bot.models);

    if (bot.botconfig?.disabled === "on") {
      if (interaction.user.id !== bot.owner_ID) {
        response.title = "Bot is currently disabled";
        if (bot.botconfig.disabled_message) {
          response.text = bot.botconfig.disabled_message;
        } else {
          response.text =
            "The bot is currently disabled. For support, please check the bot's profile.";
        }
        return response;
      }
    }

    if (bot.botconfig?.maintenance === "on") {
      if (interaction.user.id !== bot.owner_ID) {
        response.text =
          "The bot is currently under maintenance; please try again in a while.";
        return response;
      }
    }

    const ban_info = await check_ban(interaction, bot);
    if (ban_info.banned && interaction.user.id !== bot.owner_ID) {
      if (ban_info.type === "global") {
        response.text =
          "You are globally banned from accessing the bot; try `&about` to find the support server.";

        return response;
      }
      if (ban_info.type === "local") {
        if (interaction.commandName !== "unban") {
          response.text =
            "You are banned from accessing the bot on this server.";
          return response;
        }
      }
    }

    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (interaction.commandName !== "login" && !user) {
      response.text = new Template().get("not_logged");

      return response;
    }

    if (command) {
      const command_response: CommandResponse | void = await command.execute(
        bot,
        client,
        interaction,
        response
      );
      return command_response;
    }
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
    // @ts-ignore
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
  const channel = await bot.get_log_channel(client);

  if (!channel) {
    console.log("Cannot find the logging channel (exception_log_channel).");
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
