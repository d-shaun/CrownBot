import { Mongoose } from "mongoose";

export interface ArtistLogInterface {
  name: string;
  userplaycount: number;
  userID: string;
  timestamp: number;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    name: String,
    userplaycount: Number,
    userID: String,
    timestamp: Number,
  });
};
