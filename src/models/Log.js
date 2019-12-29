
module.exports = mongoose => {
	return new mongoose.Schema({
		command_name: String,
		message_content: String,
		executor: String,
		guild: String,
		channel: String,
		timestamp: String,
		stack: String,
	});
};
