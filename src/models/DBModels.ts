import { model, Mongoose } from "mongoose";
import { UserTopArtist } from "../interfaces/ArtistInterface";
import { LeaderboardInterface } from "../interfaces/LeaderboardInterface";
// import { ModelTypes } from "../typings/ModelTypes";

export const model_params = {
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
    timestamp: { type: Number, required: true },
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
    permanent: { type: Boolean },
  },

  submittedlyrics: {
    request_id: { type: String, required: true, unique: true },
    user_tag: { type: String, required: true },
    user_id: { type: String, required: true },
    track_name: { type: String, required: true },
    artist_name: { type: String, required: true },
    lyrics: { type: String, required: true },
    timestamp: { type: Number, required: true },
  },

  reportbug: {
    user: { type: String, required: true },
    userID: { type: String, required: true },
    guildID: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: String, required: true },
  },

  serverconfig: {
    guild_ID: { type: String, required: true, unique: true },
    min_plays_for_crown: { type: Number, required: true },
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
    stat: { type: <LeaderboardInterface[]>(<any>Object) },
    timestamp: { type: Number, required: true },
  },

  whoplayslog: {
    track_name: { type: String, required: true },
    artist_name: { type: String, required: true },
    guild_id: { type: String, required: true },
    listener: { type: Number, required: true },
    stat: { type: <{ user_id: string; userplaycount: string }[]>(<any>Object) },
    timestamp: { type: Number, required: true },
  },
} as const;

export function generate_models(mongoose?: Mongoose) {
  if (!mongoose) return null;
  const new_models: any = {};

  const keys: (keyof typeof model_params)[] = <any>Object.keys(model_params);

  keys.forEach((model_name) => {
    const schema = new mongoose.Schema(model_params[model_name]);

    new_models[model_name] = model(model_name, schema);
  });

  return new_models;
}

type Extras<T> = {
  [P in keyof T]?:
    | T[P]
    | {
        $in?: unknown;
        $lt?: unknown;
        $not?: unknown;
      };
};

type MongooseMethods<Z> = Z & {
  find: (query?: Extras<Z>) => Promise<Z[]>;
  findOne: (query?: Extras<Z>) => Promise<Z>;
  create: (query?: Extras<Z>) => Promise<Z>;

  findOneAndUpdate: (
    query: Extras<Z>,
    replacement: Partial<Z>,
    options?: any
  ) => Promise<Z>;

  deleteOne: (query?: Extras<Z>) => Promise<{ deletedCount: number }>;

  deleteMany: (query?: Extras<Z>) => Promise<{ deletedCount: number }>;
};

type Constructors =
  | NumberConstructor
  | StringConstructor
  | BooleanConstructor
  | DateConstructor
  | ObjectConstructor;

export type ModelTypes = {
  [K in keyof typeof model_params]: MongooseMethods<{
    -readonly [Z in keyof (typeof model_params)[K]]: (typeof model_params)[K][Z] extends {
      type: infer Y;
    }
      ? Y extends Constructors
        ? ReturnType<Y>
        : Y
      : never;
  }>;
};

export type GetReturnType<T extends keyof ModelTypes> = Awaited<
  ReturnType<ModelTypes[T]["findOne"]>
>;
