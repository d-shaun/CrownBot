import { Message } from "discord.js";
import path from "path";

import fs from "fs";
import Command from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import BotMessage from "../../handlers/BotMessage";

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

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const response = new BotMessage({ client, message, text: "", reply: true });
    if (!message.member?.hasPermission("MANAGE_GUILD")) {
      response.text =
        "You do not have the permission (``MANAGE_GUILD``) to execute this command.";
      await response.send();
      return;
    }
    interface ConfigCommandInterface {
      name: string;
      run: (client: CrownBot, message: Message, args: string[]) => void;
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
        "Tip: try `&config <option_name>` to get some information about an option. \n\n" +
        "Examples: \n`&config minplaysforcrown 30` \n `&config minplaysforcrown 20` \n \n" +
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
    command.run(client, message, secondary_args);
  }
}

export default ConfigCommand;
