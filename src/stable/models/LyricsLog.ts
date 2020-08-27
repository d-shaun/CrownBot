import { Mongoose } from "mongoose";

export interface LyricsLogInterface {
  id: number;
  track_name: string;
  artist_name: string;
  lyrics: string;
  timestamp: number;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    id: Number,
    track_name: String,
    artist_name: String,
    lyrics: String,
    timestamp: Number,
  });
};
