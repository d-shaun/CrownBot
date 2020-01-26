

module.exports = mongoose => {
    return new mongoose.Schema({
        guildID: String,
        guildName: String,
        userID: String,
        username: String,
        executor: String
    })
}