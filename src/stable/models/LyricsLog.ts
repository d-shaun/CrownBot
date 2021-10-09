import { Mongoose } from "mongoose";

export interface LyricsLogInterface {
  track_name: string;
  artist_name: string;
  lyrics: string;
  timestamp: number;
  permanent?: boolean;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    track_name: String,
    artist_name: String,
    lyrics: String,
    timestamp: Number,
    permanent: Boolean,
  });
};
