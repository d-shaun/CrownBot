import path from "path";
import { inspect } from "util";
import Command, { GuildMessage } from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import fs from "fs";

class EvalCommand extends Command {
  constructor() {
    super({
      name: "eval",
      description: "You aren't supposed to be seeing this.",
      usage: [],
      aliases: [],
      owner_only: true,
      hidden: true,
    });
  }

  async run(bot: CrownBot, message: GuildMessage, args: string[]) {
    if (message.author.id !== bot.owner_ID) return; // just to be safe

    if (args[0] !== "command") {
      let trimmed_string;
      try {
        const code = args.join(" ");
        let evaled = await eval(code);
        if (typeof evaled !== "string") {
          evaled = inspect(evaled);
        }
        trimmed_string = evaled.substring(0, 2000);
      } catch (e: any) {
        trimmed_string = (e.message ? e.message : e).substring(0, 2000);
      }

      await message.channel.send("```JS\n" + trimmed_string + "```");
      return;
    }

    // executing commands inside ./owner_only/

    interface OwnerOnlyCommandInterface {
      name: string;
      run: (
        bot: CrownBot,
        message: GuildMessage,
        args: string[]
      ) => Promise<void>;
    }

    const command_name = args[1];
    if (!command_name) {
      await message.channel.send("??");
      return;
    }
    const secondary_args = args.slice(2);
    const dir: string = path.join(__dirname, "./owner_only");
    const owner_commands: OwnerOnlyCommandInterface[] = [];
    const owner_files: string[] = fs.readdirSync(dir);
    owner_files.forEach((file: string) => {
      if (file.endsWith(".js")) {
        const Command = require(path.join(dir, file)).default;

        owner_commands.push(new Command());
      }
    });

    const command = owner_commands.find(
      (command) => command.name === command_name
    );

    if (!command) {
      await message.channel.send("Command not found.");
      return;
    }

    await command.run(bot, message, secondary_args);
    await message.channel.send("Finished executing `" + command.name + "`");
  }
}

export default EvalCommand;
