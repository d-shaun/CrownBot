import { Mongoose } from "mongoose";
import { LeaderboardInterface } from "../interfaces/LeaderboardInterface";

export interface LogInterface {
  track_name: string;
  artist_name: string;
  guild_id: string;
  listener: number;
  stat: LeaderboardInterface[];
  timestamp: number;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    track_name: String,
    artist_name: String,
    guild_id: String,
    listener: Number,
    stat: Object,
    timestamp: Number,
  });
};
