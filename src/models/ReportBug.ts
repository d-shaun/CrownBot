import { Mongoose } from "mongoose";

export interface AlbumLogInterface {
  user: string;
  userID: string;
  guildID: string;
  message: string;
  timestamp: string;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    user: String,
    userID: String,
    guildID: String,
    message: String,
    timestamp: String,
  });
};
