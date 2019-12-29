// module.exports = (sequelize, DataTypes) => {
//     return sequelize.define('users', {
//         userID: {
//             type: DataTypes.STRING,
//             unique: true
//         },
//         username: DataTypes.STRING
//     })
// }

module.exports = mongoose => {
    return new mongoose.Schema({
        userID: {
            type: String,
            unique: true
        },
        username: String
      })
}