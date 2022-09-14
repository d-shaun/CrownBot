import { Mongoose } from "mongoose";

export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    incident_id: String,
    command_name: String,
    message_content: String,
    user_ID: String,
    guild_ID: String,
    timestamp: String,
    stack: String,
  });
};
