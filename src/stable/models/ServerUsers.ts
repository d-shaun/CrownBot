import { Mongoose } from "mongoose";
export interface UserInterface {
  guildID: string;
  userID: string;
  username: string;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    guildID: String,
    userID: String,
    username: String,
  });
};
