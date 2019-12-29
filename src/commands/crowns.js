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
			usage: ["crowns", "crowns <user>"],
			aliases: ["cw"]
		});
	}

	async run(client, message, args) {
		const { check_permissions } = client.helpers;

		const has_required_permissions = check_permissions(message);
		if(!has_required_permissions) return;

		const files = fs.readdirSync(path.join(__dirname, "crowns"));
		const cmds = files.map(x => x.slice(0, x.length - 3));
		let user;
		if (args.length > 0) {
			if (cmds.includes(args[0])) {
				const command = require(`./crowns/${args[0]}`);
				await command.run(client, message, args.slice(1));
				return;
			} else {
				user = message.mentions.members.first();
			}
		} else {
			user = message.member;
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
					(el, i) =>
						`${sorted_crowns.findIndex(
							e => e.artistName == el.artistName
						) + 1}. ${el.artistName} — **${
							el.artistPlays
						} play(s)**`
				);

			FieldsEmbed.embed
				.setColor(0x00ffff)
				.setTitle(`Crowns of ${user.user.username} in ${message.guild.name}`)
				.setThumbnail(user.user.avatarURL);
			FieldsEmbed.build();

			/*
			const description =
				crowns
					.sort(
						(a, b) =>
							parseInt(b.artistPlays) - parseInt(a.artistPlays)
					)
					.slice(0, 10)
					.map(
						x =>
							`${++num}. ${x.artistName} - **${
								x.artistPlays
							}** plays`
					)
					.join("\n") +
				`\n\n${user.user.username} has **${crowns.length}** crowns in ${message.guild.name}.`;
			const embed = new BotEmbed(message)
				.setTitle(`Crowns of ${user.user.tag} in ${message.guild.name}`)
				.setDescription(description)
				.setThumbnail(user.user.avatarURL);
			await message.channel.send(embed);
			*/
		} else {
			await message.reply(`you don't have any crown in this server.`);
		}
	}
}

module.exports = CrownsCommand;
