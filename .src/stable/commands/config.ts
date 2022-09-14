import fs from "fs";
import path from "path";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";

class ConfigCommand extends Command {
  constructor() {
    super({
      name: "config",
      description: "Configures CrownBot's preferences in a guild.",
      usage: ["config"],
      aliases: [],
      required_permissions: ["MANAGE_MESSAGES"],
      category: "configure",
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    // TODO: Interactive &config with buttons/select-menus?
    const response = new BotMessage({ bot, message, text: "", reply: true });
    if (!message.member?.permissions.has("MANAGE_GUILD")) {
      response.text =
        "You do not have the permission (``MANAGE_GUILD``) to execute this command.";
      await response.send();
      return;
    }
    interface ConfigCommandInterface {
      name: string;
      run: (bot: CrownBot, message: GuildMessage, args: string[]) => void;
    }

    const command_name = args[0];
    const secondary_args = args.slice(1);
    const dir: string = path.join(__dirname, "./configs");
    const config_commands: ConfigCommandInterface[] = [];
    const config_files: string[] = fs.readdirSync(dir);
    config_files.forEach((file: string) => {
      if (file.endsWith(".js")) {
        const Command = require(path.join(dir, file)).default;

        config_commands.push(new Command());
      }
    });
    const commands_str = config_commands
      .map((command) => "`" + command.name + "`")
      .join(", ");
    if (!command_name) {
      response.text =
        "This command can be used to configure preferences of CrownBot in a server. \n" +
        "Tip: try `&config <option_name>` to get detailed information about an option. \n\n" +
        "Examples: \n`&config minplaysforcrown 30` \n `&config prefix !` \n \n" +
        "The available options are: " +
        commands_str;
      await response.send();
      return;
    }

    const command = config_commands.find(
      (command) => command.name === command_name
    );
    if (!command) {
      response.text =
        "Couldn't find the option; available options are: " +
        commands_str +
        ". Try `&config` for help.";
      await response.send();
      return;
    }
    command.run(bot, message, secondary_args);
  }
}

export default ConfigCommand;
