module.exports = mongoose => {
  return new mongoose.Schema({
    userID: String,
    guildID: String,
    discord_username: String,
    lastfm_username: String,
    artistName: {
      type: String
    },
    artistPlays: Number
  });
};
