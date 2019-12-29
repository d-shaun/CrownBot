const Command = require("../handler/Command");
const BotEmbed = require("../classes/BotEmbed");
const fs = require("fs");
const path = require("path");

class LeaderboardCommand extends Command {
	constructor() {
		super({
			name: "leaderboard",
			description: "Displays global leaderboard of an artist.",
			usage: ["leaderboard", "leaderboard <artist name>"],
			aliases: ["lb"]
		});
	}

	async run(client, message, args) {
		const { users, userplays } = client.models;

		// "getters"
		const { get_username, get_nowplaying, get_artistinfo } = client.helpers;

		// "setters"
		const { update_usercrown, update_userplays } = client.helpers;

		// parsers
		const { parse_artistinfo } = client.helpers;

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

		const { artist } = await get_artistinfo({
			client,
			message,
			artistName
		});
		if (!artist) return;

		const { name } = parse_artistinfo(artist);

		const artist_plays = await userplays.find({
			artistName: name
		});
		if (!artist_plays.length) {
			message.reply(
				"none of the registered users listen to ``" + name + "``."
			);
			return;
		}

		let leaderboard = artist_plays.sort(
			(a, b) => b.artistPlays - a.artistPlays
		);
		if (leaderboard.length > 10) {
			leaderboard.length = 10;
		}
		let num = 0;
		const description = leaderboard
			.map(
				x =>
					`${++num}. ${x.lastfm_username} — **${
						x.artistPlays
					}** plays`
			)
			.join("\n");
		const embed = new BotEmbed(message)
			.setTitle(`Top registered listeners of ${name}`)
			.setDescription(
				description + "\n\n(Run ``&whoknows`` command to update this.)"
			);
		await message.channel.send(embed);
	}
}

module.exports = LeaderboardCommand;
