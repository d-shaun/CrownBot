import { Mongoose } from "mongoose";

export interface BotConfigInterface {
  exception_log_channel: string;
  maintenance: boolean;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    exception_log_channel: String,
    maintenance: Boolean,
  });
};
