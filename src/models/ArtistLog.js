module.exports = mongoose => {
  return new mongoose.Schema({
    name: String,
    userplaycount: Number,
    userID: String,
    timestamp: Number
  });
};
