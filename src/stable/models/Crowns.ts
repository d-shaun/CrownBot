import { Mongoose } from "mongoose";
export interface CrownInterface {
  guildID: string;
  userID: string;
  userTag: string;
  lastfm_username: string;
  artistName: string;
  artistPlays: number;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    guildID: {
      type: String,
    },
    userID: String,
    userTag: String,
    lastfm_username: String,
    artistName: String,
    artistPlays: Number,
  });
};
