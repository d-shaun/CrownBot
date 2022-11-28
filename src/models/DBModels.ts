import { model, Mongoose } from "mongoose";
import { UserTopArtist } from "../interfaces/ArtistInterface";

const model_params = {
  albumlog: {
    name: { type: String, required: true },
    artistName: { type: String, required: true },
    userplaycount: { type: Number, required: true },
    userID: { type: String, required: true },
    timestamp: { type: Number, required: true },
  },

  artistlog: {
    name: { type: String, required: true },
    userplaycount: { type: Number, required: true },
    userID: { type: String, required: true },
    timestamp: { type: Number, required: true },
  },
  bans: {
    guildID: { type: String, required: true },
    guildName: { type: String, required: true },
    userID: { type: String, required: true },
    username: { type: String, required: true },
    executor: { type: String, required: true },
  },

  botconfig: {
    exception_log_channel: { type: String, required: false },
    maintenance: { type: String, required: false },
    disabled: { type: String, required: false },
    disabled_message: { type: String, required: false },
  },

  crowns: {
    guildID: {
      type: String,
      required: true,
    },
    userID: { type: String, required: true },
    userTag: { type: String, required: true },
    lastfm_username: { type: String, required: true },
    artistName: { type: String, required: true },
    artistPlays: { type: Number, required: true },
  },

  errorlogs: {
    incident_id: { type: String, required: true },
    command_name: String,
    message_content: String,
    user_ID: { type: String, required: true },
    guild_ID: { type: String, required: true },
    timestamp: String,
    stack: String,
  },

  listartistlog: {
    user_id: { type: String, required: true },
    guild_id: { type: String, required: true },
    stat: {
      type: <UserTopArtist["topartists"]["artist"]>(<unknown>Object),
      required: true,
    },
    timestamp: Number,
  },

  logs: {
    error_id: String,
    error_message: String,
    command_name: String,
    user_ID: String,
    guild_ID: String,
    timestamp: Date,
  },

  lyricslog: {
    track_name: { type: String, required: true },
    artist_name: { type: String, required: true },
    lyrics: { type: String, required: true },
    timestamp: { type: Number, required: true },
    permanent: Boolean,
  },

  reportbug: {
    user: { type: String, required: true },
    userID: { type: String, required: true },
    guildID: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: String, required: true },
  },

  serverconfig: {
    guild_ID: {
      type: { type: String, required: true },
      unique: true,
    },
    min_plays_for_crown: Number,
  },

  serverusers: {
    guildID: { type: String, required: true },
    userID: { type: String, required: true },
    username: { type: String, required: true },
  },

  tracklog: {
    name: { type: String, required: true },
    artistName: { type: String, required: true },
    userplaycount: { type: Number, required: true },
    userID: { type: String, required: true },
    timestamp: { type: Number, required: true },
  },

  whoknowslog: {
    artist_name: { type: String, required: true },
    guild_id: { type: String, required: true },
    listener: { type: Number, required: true },
    stat: Object,
    timestamp: { type: Number, required: true },
  },

  whoplayslog: {
    track_name: String,
    artist_name: String,
    guild_id: String,
    listener: Number,
    stat: Object,
    timestamp: Number,
  },
} as const;

export function generate_models(mongoose?: Mongoose) {
  if (!mongoose) return null;

  const models: ModelTypes = <any>Object.keys(model_params).map((key: any) => {
    model(key, new mongoose.Schema((<any>model_params)[key]));
  });

  return models;
}

///////////

// Typings clusterfuck
// mongoose is kinda trash at it so I implemented my own hacky typings

////////

type Extras = {
  $in?: any[];
  $lt?: any;
};
type MongooseMethods<Z> = Z & {
  find: <Y extends Partial<Z>>(query?: {
    [I in keyof Y]: Y[I] | Extras;
  }) => Promise<Z[]>;
  findOne: <Y extends Partial<Z>>(query?: {
    [I in keyof Y]: Y[I] | Extras;
  }) => Promise<Z>;
  findOneAndUpdate: <Y extends Partial<Z>>(
    query: Y,
    replacement: Y,
    options?: any
  ) => Promise<Z>;
};

export type ModelTypes = {
  [K in keyof typeof model_params]: MongooseMethods<{
    -readonly [Z in keyof typeof model_params[K]]: typeof model_params[K][Z] extends {
      type: infer Y extends
        | NumberConstructor
        | StringConstructor
        | BooleanConstructor
        | DateConstructor
        | ObjectConstructor;
    }
      ? ReturnType<Y>
      : unknown;
  }>;
};

export type GetReturnType<T extends keyof ModelTypes> = Awaited<
  ReturnType<ModelTypes[T]["findOne"]>
>;
