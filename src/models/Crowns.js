module.exports = mongoose => {
  return new mongoose.Schema({
    guildID: {
      type: String
    },
    userID: String,
    userTag: String,
    artistName: String,
    artistPlays: Number
  });
};
