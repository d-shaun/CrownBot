
module.exports = mongoose => {
	return new mongoose.Schema({
		command_name: String,
		message_id: String,
		message_content: String,
		username: String,
		user_ID: String,
		guild_name: String,
		guild_ID: String,
		channel: String,
		timestamp: String,
		stack: String,
	});
};
