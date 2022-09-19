import { Mongoose } from "mongoose";

export interface OptInInterface {
  type: string;
  guild_ID: string;
  guild_name: string;
  username: string;
  user_ID: string;
  timestamp: string;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    type: String,
    guild_ID: {
      type: String,
      unique: true,
    },
    guild_name: String,
    username: String,
    user_ID: String,
    timestamp: String,
  });
};
