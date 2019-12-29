

module.exports = mongoose => {
    return new mongoose.Schema({
        guildID: {
            type: String,
            unique: true
        },
        userID: {
            type: String,
            unique: true
        }
    })
}