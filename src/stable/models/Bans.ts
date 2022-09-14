import { Mongoose } from "mongoose";
export interface BanInterface {
  guildID: string;
  guildName: string;
  userID: string;
  username: string;
  executor: string;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    guildID: String,
    guildName: String,
    userID: String,
    username: String,
    executor: String,
  });
};
