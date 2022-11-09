import { Mongoose } from "mongoose";

export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    error_id: String,
    error_message: String,
    command_name: String,
    user_ID: String,
    guild_ID: String,
    timestamp: String,
  });
};
