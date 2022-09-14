import { Mongoose } from "mongoose";

export interface AlbumLogInterface {
  name: string;
  artistName: string;
  userplaycount: number;
  userID: string;
  timestamp: number;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    name: String,
    artistName: String,
    userplaycount: Number,
    userID: String,
    timestamp: Number,
  });
};
