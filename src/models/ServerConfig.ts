import { Mongoose } from "mongoose";

export interface ServerConfigInterface {
  guild_ID: string;
  min_plays_for_crown: number;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    guild_ID: {
      type: String,
      unique: true,
    },
    min_plays_for_crown: Number,
  });
};
