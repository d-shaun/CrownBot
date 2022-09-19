import { Mongoose } from "mongoose";
import { UserTopArtist } from "../interfaces/ArtistInterface";

export interface ListArtistLogInterface {
  user_id: string;
  guild_id: string;
  stat: UserTopArtist[];
  timestamp: number;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    user_id: String,
    guild_id: String,
    stat: Object,
    timestamp: Number,
  });
};
