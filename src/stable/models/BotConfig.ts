import { Mongoose } from "mongoose";

export interface BotConfigInterface extends Object {
  exception_log_channel: string;
  maintenance: string;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    exception_log_channel: String,
    maintenance: String,
  });
};
