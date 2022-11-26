import { model, Mongoose } from "mongoose";
import { UserTopArtist } from "../interfaces/ArtistInterface";

export function generate_models(mongoose?: Mongoose) {
  if (!mongoose) return null;

  const albumlog = model(
    "albumlog",
    new mongoose.Schema({
      name: { type: String, required: true },
      artistName: { Type: String, required: true },
      userplaycount: { type: Number, required: true },
      userID: { type: String, required: true },
      timestamp: { type: Number, required: true },
    })
  );

  const artistlog = model(
    "artistlog",
    new mongoose.Schema({
      name: { type: String, required: true },
      userplaycount: { type: Number, required: true },
      userID: { type: String, required: true },
      timestamp: { type: Number, required: true },
    })
  );

  const bans = model(
    "bans",
    new mongoose.Schema({
      guildID: { type: String, required: true },
      guildName: { type: String, required: true },
      userID: { type: String, required: true },
      username: { type: String, required: true },
      executor: { type: String, required: true },
    })
  );

  const botconfig = model(
    "botconfig",
    new mongoose.Schema({
      exception_log_channel: { type: String, required: false },
      maintenance: { type: String, required: false },
      disabled: { type: String, required: false },
      disabled_message: { type: String, required: false },
    })
  );

  const crowns = model(
    "crowns",
    new mongoose.Schema({
      guildID: {
        type: String,
        required: true,
      },
      userID: { type: String, required: true },
      userTag: { type: String, required: true },
      lastfm_username: { type: String, required: true },
      artistName: { type: String, required: true },
      artistPlays: { type: Number, required: true },
    })
  );

  const errorlogs = model(
    "errorlogs",
    new mongoose.Schema({
      incident_id: { type: String, required: true },
      command_name: String,
      message_content: String,
      user_ID: { type: String, required: true },
      guild_ID: { type: String, required: true },
      timestamp: String,
      stack: String,
    })
  );

  const listartistlog = model(
    "listartistlog",
    new mongoose.Schema({
      user_id: { type: String, required: true },
      guild_id: { type: String, required: true },
      stat: {
        type: <UserTopArtist["topartists"]["artist"]>(<unknown>Object),
        required: true,
      },
      timestamp: Number,
    })
  );

  const logs = model(
    "logs",
    new mongoose.Schema({
      error_id: String,
      error_message: String,
      command_name: String,
      user_ID: String,
      guild_ID: String,
      timestamp: Date,
    })
  );

  const lyricslog = model(
    "lyricslog",
    new mongoose.Schema({
      track_name: { type: String, required: true },
      artist_name: { type: String, required: true },
      lyrics: { type: String, required: true },
      timestamp: { type: Number, required: true },
      permanent: Boolean,
    })
  );

  const reportbug = model(
    "reportbug",
    new mongoose.Schema({
      user: { type: String, required: true },
      userID: { type: String, required: true },
      guildID: { type: String, required: true },
      message: { type: String, required: true },
      timestamp: { type: String, required: true },
    })
  );

  const serverconfig = model(
    "serverconfig",
    new mongoose.Schema({
      guild_ID: {
        type: { type: String, required: true },
        unique: true,
      },
      min_plays_for_crown: Number,
    })
  );

  const serverusers = model(
    "serverusers",
    new mongoose.Schema({
      guildID: { type: String, required: true },
      userID: { type: String, required: true },
      username: { type: String, required: true },
    })
  );

  const tracklog = model(
    "tracklog",
    new mongoose.Schema({
      name: { type: String, required: true },
      artistName: { type: String, required: true },
      userplaycount: { type: Number, required: true },
      userID: { type: String, required: true },
      timestamp: { type: Number, required: true },
    })
  );

  const whoknowslog = model(
    "whoknowslog",
    new mongoose.Schema({
      artist_name: { type: String, required: true },
      guild_id: { type: String, required: true },
      listener: { type: Number, required: true },
      stat: Object,
      timestamp: { type: Number, required: true },
    })
  );

  const whoplayslog = model(
    "whoplayslog",
    new mongoose.Schema({
      track_name: String,
      artist_name: String,
      guild_id: String,
      listener: Number,
      stat: Object,
      timestamp: Number,
    })
  );

  //

  //
  // Return all in key-value pair based on variable names
  // ex: { "whoknowslog": Model<whoknowslog> }
  return {
    albumlog,
    artistlog,
    bans,
    botconfig,
    crowns,
    errorlogs,
    listartistlog,
    logs,
    lyricslog,
    reportbug,
    serverconfig,
    serverusers,
    tracklog,
    whoknowslog,
    whoplayslog,
  };
}

// mongoose models as "types" with this one simple trick
export type MongooseModelTypes = Exclude<
  ReturnType<typeof generate_models>,
  null
>;

export type ModelTypes = Exclude<ReturnType<typeof generate_models>, null>;

// stupid hack to "extract" return document interface from stupid mongoose model thingy
export type ExtractModelType<T extends keyof MongooseModelTypes> = ReturnType<
  MongooseModelTypes[T]["castObject"]
>;
