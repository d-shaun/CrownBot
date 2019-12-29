const Command = require("../handler/Command");

class ArtistPlaysCommand extends Command {
	constructor() {
		super({
			name: "plays",
			description:
				"Updates the play count of a user. (Doesn't output any message as to better integrate with FMCord.)",
			usage: ["plays", "plays <artist name>"],
			aliases: ["p"],
			hidden: true
		});
	}

	async run(client, message, args) {
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
			artistName,
			user
		});

		if (!artist) return;
		const { name, userplaycount } = parse_artistinfo(artist);

		// disabled replying 'cause FMCord does it for us
		// await message.reply( `you have scrobbled \`\`${name}\`\` **${userplaycount} times**.`);

		await update_usercrown({
			client,
			message,
			artistName: name,
			user,
			userplaycount
		});

		// await update_userplays({
		// 	client,
		// 	message,
		// 	artistName: name,
		// 	user,
		// 	userplaycount
		// });
	}
}
module.exports = ArtistPlaysCommand;
