module.exports = mongoose => {
  return new mongoose.Schema({
    userID: {
      type: String,
      unique: true
    },
    username: String
  });
};
