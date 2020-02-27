module.exports = mongoose => {
  return new mongoose.Schema({
    name: String,
    artistName: String,
    userplaycount: Number,
    userID: String,
    timestamp: Number
  });
};
