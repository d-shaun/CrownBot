import { Mongoose } from "mongoose";

export interface SnapLogInterface {
  userID: string;
  guildID: string;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    userID: String,
    guildID: String,
  });
};
