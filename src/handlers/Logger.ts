import { CommandResponse } from "./CommandResponse";
import CrownBot from "./CrownBot";

export default class Logger {
  bot: CrownBot;
  constructor(bot: CrownBot) {
    this.bot = bot;
  }

  async log_error(response: CommandResponse) {
    const data = {
      error_id: response.error_code || "custom",
      error_message: response.error_message,
      command_name: response.interaction.commandName,
      user_ID: response.interaction.user.id,
      guild_ID: response.interaction.guild.id,
      timestamp: `${new Date().toUTCString()}`,
    };
    return await new this.bot.models.logs({ ...data }).save();
  }
}
