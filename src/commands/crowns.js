const Command = require("../handler/Command");
const BotEmbed = require("../classes/BotEmbed");
const fs = require("fs");
const path = require("path");
const Pagination = require("discord-paginationembed");

class CrownsCommand extends Command {
  constructor() {
    super({
      name: "crowns",
      description: "Displays crowns of an user.",
      usage: ["crowns", "crowns <username>", "crowns <@user>"],
      aliases: ["cw"]
    });
  }

  async run(client, message, args) {
    const { check_permissions, get_guild_user } = client.helpers;

    const has_required_permissions = check_permissions(message);
    if (!has_required_permissions) return;

    const files = fs.readdirSync(path.join(__dirname, "crowns"));
    const cmds = files.map(x => x.slice(0, x.length - 3));
    let user;
    if (args.length > 0) {
      user = message.mentions.members.first();
      user = user ? user.user : await get_guild_user({ args, message });
    } else {
      user = message.member ? message.member.user : false;
    }

    if (!user) {
      await client.notify({
        message,
        desc: "user not found.",
        reply: true
      });
      return;
    }
    const crowns = await client.models.crowns.find({
      guildID: message.guild.id,
      userID: user.id
    });
    if (crowns.length > 0) {
      let num = 0;

      const sorted_crowns = crowns.sort(
        (a, b) => parseInt(b.artistPlays) - parseInt(a.artistPlays)
      );

      const FieldsEmbed = new Pagination.FieldsEmbed()
        .setArray(sorted_crowns)
        .setAuthorizedUsers([])
        .setChannel(message.channel)
        .setElementsPerPage(15)
        .setPageIndicator(true)
        .setDisabledNavigationEmojis(["DELETE"])
        .formatField(
          `Total: ${sorted_crowns.length} crowns`,
          el =>
            `${sorted_crowns.findIndex(e => e.artistName == el.artistName) +
              1}. ${el.artistName} — **${el.artistPlays} play(s)**`
        );

      FieldsEmbed.embed
        .setColor(0x00ffff)
        .setTitle(`Crowns of ${user.username} in ${message.guild.name}`)
        .setThumbnail(user.avatarURL);
      await FieldsEmbed.build();
    } else {
      await client.notify({
        message,
        desc: "you don't have any crown in this server.",
        reply: true
      });
    }
  }
}

module.exports = CrownsCommand;
