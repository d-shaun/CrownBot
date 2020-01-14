const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");
const BotEmbed = require("../classes/BotEmbed");
const Pagination = require("discord-paginationembed");
class WhoKnowsCommand extends Command {
	constructor() {
		super({
			name: "whoknows",
			description:
				"Checks if anyone in a guild listens to a certain artist. " +
				"If no artist is defined, the bot will try to look up the artist you are " +
				"currently listening to.",
			usage: ["whoknows", "whoknows <artist name>"],
			aliases: ["w"]
		});
	}

	async run(client, message, args) {
		const server_prefix = client.getCachedPrefix(message);
		
		const { users, userplays } = client.models;

		// "getters"
		const { get_username, get_nowplaying, get_artistinfo } = client.helpers;

		// "setters"
		const { update_usercrown, update_userplays } = client.helpers;

		// parsers
		const { parse_artistinfo } = client.helpers;

		// checks
		const { check_permissions } = client.helpers;

		const has_required_permissions = check_permissions(message);

		if (!has_required_permissions) return;

		let artistName = null;

		const user = await get_username(client, message);
		if (!user) return;

		if (args.length === 0) {
			const now_playing = await get_nowplaying(client, message, user);
			if (!now_playing) return;
			artistName = now_playing.artist[`#text`];
		} else {
			artistName = args.join(` `);
		}

		// check if the artist exists
		const { artist } = await get_artistinfo({
			client,
			message,
			artistName,
			user
		});
		if (!artist) return;
		const guild = await message.guild.fetchMembers();
		const ids = guild.members.map(e => e.id);
		let registered_guild_users = await users.find({
			userID: {
				$in: ids
			}
		});
		if (registered_guild_users.length <= 0) {
			message.reply(
				"no user in this guild has registered their last.fm username."
			);
			return;
		}
		if (registered_guild_users.length > 100) {
			registered_guild_users.length = 100;
		}
		let unsorted_leaderboard = [];
		let proper_artistName = false;
		for await (const user of registered_guild_users) {
			const { artist } = await get_artistinfo({
				client,
				message,
				artistName,
				user
			});
			if (!artist) return;
			let discord_username = guild.members.find(e => e.id === user.userID)
				.user.username;
			let discord_user = guild.members.find(e => e.id === user.userID)
				.user;

			const { name, userplaycount } = parse_artistinfo(artist);

			if (!proper_artistName) proper_artistName = name;

			if (userplaycount <= 0) {
				continue;
			}
			let wrapped_message = {
				author: {
					id: discord_user.id,
					tag: discord_user.tag
				},
				guild: {
					id: message.guild.id
				}
			};
			// await update_userplays({
			// 	client,
			// 	message: wrapped_message,
			// 	artistName: name,
			// 	user,
			// 	userplaycount
			// });

			unsorted_leaderboard.push({
				discord_username,
				userplaycount,
				user
			});
		}

		if (unsorted_leaderboard.length <= 0) {
			message.reply(
				"no one here listens to ``" + proper_artistName + "``."
			);
			return;
		}
		const leaderboard = unsorted_leaderboard.sort(
			(a, b) => parseInt(b.userplaycount) - parseInt(a.userplaycount)
		);

		const top_user = leaderboard[0];

		await update_usercrown({
			client,
			message,
			artistName: proper_artistName,
			user: top_user.user,
			userplaycount: top_user.userplaycount
		});

		// const description = leaderboard
		// 	.map((stack, index) => {
		// 		return `${index + 1}. ${stack.discord_username} — **${
		// 			stack.userplaycount
		// 		}** plays`;
		// 	})
		// 	.join("\n");

		// const embed = new BotEmbed(message)
		// 	.setTitle(
		// 		`Who knows ${proper_artistName} in ${message.guild.name}?`
		// 	)
		// 	.setDescription(description);

		const total_scrobbles = leaderboard.reduce(
			(a, b) => a + parseInt(b.userplaycount),
			0
		);
		const FieldsEmbed = new Pagination.FieldsEmbed()
			.setArray(leaderboard)
			.setAuthorizedUsers([])
			.setChannel(message.channel)
			.setElementsPerPage(15)
			.setPageIndicator(true)
			.setDisabledNavigationEmojis(["DELETE"])
			.formatField(
				`Total: ${total_scrobbles} plays`,
				el =>
					`${leaderboard.findIndex(e => e.user.id == el.user.id) +
						1}. ${el.discord_username} — **${
						el.userplaycount
					} play(s)**`
			);
			
		FieldsEmbed.embed
			.setColor(0x00ffff)
			.setTitle(
				`Who knows ${proper_artistName} in ${message.guild.name}?`
			)
			.setFooter(
				`Psst, try ${server_prefix}about to find the support server.`
			);
		FieldsEmbed.build();

	}
}

module.exports = WhoKnowsCommand;
