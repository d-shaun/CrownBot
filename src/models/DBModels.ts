import { connect, model, Mongoose } from "mongoose";

export function generate_models(mongoose?: Mongoose) {
  if (!mongoose) return null;

  return {
    AlbumLog: model(
      "AlbumLog",
      new mongoose.Schema({
        name: String,
        artistName: String,
        userplaycount: Number,
        userID: String,
        timestamp: Number,
      })
    ),

    ArtistLog: model(
      "ArtistLog",
      new mongoose.Schema({
        name: String,
        userplaycount: Number,
        userID: String,
        timestamp: Number,
      })
    ),

    Bans: model(
      "ArtistLog",
      new mongoose.Schema({
        guildID: String,
        guildName: String,
        userID: String,
        username: String,
        executor: String,
      })
    ),

    BotConfig: model(
      "BotConfig",
      new mongoose.Schema({
        exception_log_channel: String,
        maintenance: String,
        disabled: String,
        disabled_message: String,
      })
    ),

    Crowns: model(
      "Crowns",
      new mongoose.Schema({
        guildID: {
          type: String,
        },
        userID: String,
        userTag: String,
        lastfm_username: String,
        artistName: String,
        artistPlays: Number,
      })
    ),

    ErrorLogs: model(
      "ErrorLogs",
      new mongoose.Schema({
        incident_id: String,
        command_name: String,
        message_content: String,
        user_ID: String,
        guild_ID: String,
        timestamp: String,
        stack: String,
      })
    ),

    ListArtistLog: model(
      "ListArtistLog",
      new mongoose.Schema({
        user_id: String,
        guild_id: String,
        stat: Object,
        timestamp: Number,
      })
    ),

    Logs: model(
      "Logs",
      new mongoose.Schema({
        error_id: String,
        error_message: String,
        command_name: String,
        user_ID: String,
        guild_ID: String,
        timestamp: Date,
      })
    ),

    LyricsLog: model(
      "LyricsLog",
      new mongoose.Schema({
        track_name: String,
        artist_name: String,
        lyrics: String,
        timestamp: Number,
        permanent: Boolean,
      })
    ),

    OptIns: model(
      "OptIns",
      new mongoose.Schema({
        type: String,
        guild_ID: {
          type: String,
          unique: true,
        },
        guild_name: String,
        username: String,
        user_ID: String,
        timestamp: String,
      })
    ),

    ReportBug: model(
      "ReportBug",
      new mongoose.Schema({
        user: String,
        userID: String,
        guildID: String,
        message: String,
        timestamp: String,
      })
    ),

    ServerConfig: model(
      "ServerConfig",
      new mongoose.Schema({
        guild_ID: {
          type: String,
          unique: true,
        },
        min_plays_for_crown: Number,
      })
    ),

    ServerUsers: model(
      "ServerUsers",
      new mongoose.Schema({
        guildID: String,
        userID: String,
        username: String,
      })
    ),

    TrackLog: model(
      "TrackLog",
      new mongoose.Schema({
        name: String,
        artistName: String,
        userplaycount: Number,
        userID: String,
        timestamp: Number,
      })
    ),

    Users: model(
      "Users",
      new mongoose.Schema({
        userID: {
          type: String,
          unique: true,
        },
        username: String,
      })
    ),

    WhoKnowsLog: model(
      "WhoKnowsLog",
      new mongoose.Schema({
        artist_name: String,
        guild_id: String,
        listener: Number,
        stat: Object,
        timestamp: Number,
      })
    ),

    WhoPlaysLog: model(
      "WhoPlaysLog",
      new mongoose.Schema({
        track_name: String,
        artist_name: String,
        guild_id: String,
        listener: Number,
        stat: Object,
        timestamp: Number,
      })
    ),
  } as const;
}

export type ModelTypes = Exclude<ReturnType<typeof generate_models>, null>;
