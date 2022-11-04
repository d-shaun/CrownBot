import { APIInteractionGuildMember, GuildMember } from "discord.js";

export default function parse_spotify(
  member: GuildMember | APIInteractionGuildMember | null
) {
  let artist_name = null,
    album_name = null,
    track_name = null,
    createdTimeStamp = null;

  if (member instanceof GuildMember) {
    const spotify_presence = member.presence?.activities.find(
      (act) => act.name === "Spotify"
    );
    if (spotify_presence) {
      artist_name = spotify_presence.state?.split("; ")[0] || null;
      album_name = spotify_presence.assets?.largeText || null;
      track_name = spotify_presence.details || null;
      createdTimeStamp = spotify_presence.createdTimestamp;
    }
  }
  return {
    artist_name,
    album_name,
    track_name,
    createdTimeStamp,
  };
}
