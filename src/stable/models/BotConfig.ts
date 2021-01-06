import { Mongoose } from "mongoose";

export interface BotConfig {
  exception_log_channel: string;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    exception_log_channel: String,
  });
};
