const Command = require("../handler/Command");

class MyLoginCommand extends Command {
	constructor() {
		super({
			name: "mylogin",
			description: "Displays user's last.fm username.",
			usage: ["mylogin"],
			aliases: ["me"]
		});
	}

	async run(client, message, args) {
        const { get_username } = client.helpers;
		const user = await get_username(client, message);
        if(!user) return;
        await message.reply(
            `your last.fm username is \`\`${user.username}\`\`.`
        );

    }
}

module.exports = MyLoginCommand;
