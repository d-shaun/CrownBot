const Command = require("../handler/Command");
const { stringify } = require("querystring");
const fetch = require("node-fetch");
const BotEmbed = require("../classes/BotEmbed");
class SongPlaysCommand extends Command {
	constructor() {
		super({
			name: "songplays",
			description: "Displays user's play count of a song.",
			usage: ["songplays", "songplays <artist name>"],
			aliases: ["spl"]
		});
	}

	async run(client, message, args) {
		const server_prefix = client.getCachedPrefix(message);

		// "getters"
		const { get_username, get_nowplaying, get_trackinfo } = client.helpers;

		// "setters"
		const { update_usercrown, update_userplays } = client.helpers;

		// parsers
		const { parse_trackinfo } = client.helpers;

		let songName;
		let artistName;
		const user = await get_username(client, message);
		if (!user) return;
		if (args.length === 0) {
			const now_playing = await get_nowplaying(client, message, user);
			if (!now_playing) return;
			artistName = now_playing.artist[`#text`];
			songName = now_playing.name;
		} else {
			let str = args.join(` `);
			let str_array = str.split("||");
			if (str_array.length !== 2) {
				await message.reply(
					"invalid format; try ``"+server_prefix+"spl <song name>||<artist name>``. (Example: ``"+server_prefix+"spl Sylvia||The Antlers``.)"
				);
				return;
			}
			songName = str_array[0].trim();
			artistName = str_array[1].trim();
		}

		let { track } = await get_trackinfo({
			client,
			message,
			artistName,
			songName,
			user
		});

		if (!track) return;
		let { name, artist, userplaycount, playcount, duration } = parse_trackinfo(track);
		console.log(duration);
		if (userplaycount <= 0) {
			message.reply("you have never played this song before.");
		} else {
			const percentage = ((userplaycount / playcount) * 100).toFixed(2);
			const embed = new BotEmbed(message)
				.setTitle(`Track plays`)
				.setDescription(
					`**${name}** by **${artist.name}** — ${userplaycount} play(s) \n\n (**${percentage}%** of ${playcount})`
				);
			await message.channel.send(embed);
		}
	}
}

module.exports = SongPlaysCommand;
