const Command = require("../handler/Command");
const { inspect } = require("util");

class EvalCommand extends Command {
	constructor() {
		super({
			name: "eval",
			ownerOnly: true,
			hidden: true
		});
	}

	async run(client, message, args) {
		try {
			const code = args.join(" ");
			let evaled = await eval(code);
			if (typeof evaled !== "string") {
				evaled = inspect(evaled);
			}
			var trimmedString = evaled.substring(0, 2000);
			await message.channel.send(trimmedString, {
				code: "js",
				split: true
			});
		} catch (e) {
			var trimmedString = e.substring(0, 2000);

			await message.channel.send(trimmedString, {
				code: "xl",
				split: true
			});
		}
	}
}

module.exports = EvalCommand;
