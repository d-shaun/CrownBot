module.exports = mongoose => {
  return new mongoose.Schema({
    guildID: {
      type: String,
      unique: true
	},
  prefix: String,
  guildName: String
  });
};
