// import { PaginationEmbed } from "discord-paginationembed/typings";
import { PaginationEmbed } from "discord-paginationembed/typings";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import get_registered_users from "../../misc/get_registered_users";
class TestCommand extends Command {
  constructor() {
    super({
      name: "test",
      description: "N/A",
      usage: [],
      aliases: [],
    });
  }

  async run(bot: CrownBot, message: GuildMessage) {
    const users = await get_registered_users(bot, message);
    await message.channel.send(
      "```JS\n" + JSON.stringify(users, undefined, 2) + "\n```"
    );
    console.log(users);
    // const embed1 = new MessageEmbed()
    //   .setTitle("First Page")
    //   .setDescription("This is the first page");

    // const embed2 = new MessageEmbed()
    //   .setTitle("Second Page")
    //   .setDescription("This is the second page");

    // const button1 = new MessageButton()
    //   .setCustomId("previousbtn")
    //   .setLabel("Previous")
    //   .setStyle("DANGER");

    // const button2 = new MessageButton()
    //   .setCustomId("nextbtn")
    //   .setLabel("Next")
    //   .setStyle("SUCCESS");

    // // Create an array of embeds
    // const pages = [
    //   embed1,
    //   embed2,
    //   //....
    //   //embedN
    // ];

    // const buttonList = [button1, button2];
    // // const paginationEmbed = require("discordjs-button-pagination");
    // // Call the paginationEmbed method, first three arguments are required
    // // timeout is the time till the reaction collectors are active, after this you can't change pages (in ms), defaults to 120000
    // // PaginationEmbed(message, pages, buttonList);
  }
}

export default TestCommand;
