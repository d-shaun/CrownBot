import { Mongoose } from "mongoose";

export interface PrefixInterface {
  guildID: string;
  prefix: string;
  guildName: string;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    guildID: {
      type: String,
      unique: true,
    },
    prefix: String,
    guildName: String,
  });
};
