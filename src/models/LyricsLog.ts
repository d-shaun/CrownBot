import { Mongoose } from "mongoose";

export interface LyricsLogInterface {
  id: number;
  name: string;
  lyrics: string;
  timestamp: number;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    id: Number,
    name: String,
    lyrics: String,
    timestamp: Number,
  });
};
