import { Mongoose } from "mongoose";
export interface UserInterface {
  userID: string;
  username: string;
}
export default (mongoose: Mongoose) => {
  return new mongoose.Schema({
    userID: {
      type: String,
      unique: true,
    },
    username: String,
  });
};
