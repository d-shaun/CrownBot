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
					"invalid format; try ``&spl <song name>||<artist name>``. (Example: ``&spl Sylvia||The Antlers``.)"
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
		let { name, artist, userplaycount, playcount } = parse_trackinfo(track);
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

	async run_old(client, message, args) {
		const { bans, users, crowns } = client.models;
		const user = await users.findOne({
			userID: message.author.id
		});
		if (!user) {
			await message.reply(
				"please set your last.fm username with the ``&login`` command first."
			);
			return;
		}
		let songName;
		let artistName;
		if (args.length === 0) {
			const params = stringify({
				method: "user.getrecenttracks",
				user: user.username,
				api_key: client.apikey,
				format: "json"
			});
			const data = await fetch(`${client.url}${params}`).then(r =>
				r.json()
			);
			if (data.error) {
				await message.reply(
					"something went wrong with getting info from Last.fm."
				);
				console.error(data);
				return;
			} else {
				const song = data.recenttracks.track[0];
				if (song[`@attr`] && song[`@attr`].nowplaying) {
					artistName = song.artist[`#text`];
					songName = song.name;
				} else {
					await message.reply(
						"you aren't playing anything; try ``&spl <song name>||<artist name>``. (Example: ``&spl Sylvia||The Antlers``.)"
					);
					return;
				}
			}
		} else {
			let str = args.join(` `);
			let str_array = str.split("||");
			if (str_array.length !== 2) {
				await message.reply(
					"invalid format; try ``&spl <song name>||<artist name>``. (Example: ``&spl Sylvia||The Antlers``.)"
				);
				return;
			}
			songName = str_array[0].trim();
			artistName = str_array[1].trim();
		}

		const params = stringify({
			method: "track.getInfo",
			artist: artistName,
			track: songName,
			user: user.username,
			api_key: client.apikey,
			format: "json"
		});
		const data = await fetch(`${client.url}${params}`).then(r => r.json());
		if (data.error) {
			await message.reply(`couldn't find the song.`);
			return;
		}
		if (data.track.userplaycount <= 0) {
			await message.reply(
				`you haven't scrobbled the song \`\`${data.track.name}\`\` by \`\`${data.track.artist.name}\`\`.`
			);
		} else {
			await message.reply(
				`you have scrobbled the song \`\`${data.track.name}\`\` by \`\`${data.track.artist.name}\`\` ${data.track.userplaycount} times.`
			);
		}
	}
}

module.exports = SongPlaysCommand;
