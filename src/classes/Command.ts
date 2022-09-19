import { Client } from "discord.js";
import BotMessage from "../handlers/BotMessage";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import check_ban from "../misc/check_ban";
import GuildChatInteraction from "./GuildChatInteraction";
import { Template } from "./Template";

export async function preflight_checks(
  bot: CrownBot,
  client: Client,
  interaction: GuildChatInteraction,
  command: any
) {
  try {
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
  } catch (e) {
    console.log("Uncaught exception at pre-flight checks");
    console.log(e);
  }
}

//TODO: re-add sending exception logs to channel
