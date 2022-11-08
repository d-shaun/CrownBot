import { Mongoose } from "mongoose";

export interface BotConfigInterface extends Object {
  exception_log_channel: string;
  maintenance: string;
  disabled: string;
  disabled_message: string;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    exception_log_channel: String,
    maintenance: String,
    disabled: String,
    disabled_message: String,
  });
};
