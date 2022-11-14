import cb from "../misc/codeblock";

export class Template {
  templates = [
    {
      id: "not_playing",
      text: "You aren't playing anything; to check if your scrobbles are being recorded, use the `/recent` command.",
    },
    {
      id: "404_artist",
      text: "The bot was unable to find the artist.",
    },
    {
      id: "not_logged",
      text:
        `You are not logged into the bot in this server; ` +
        `please use the ${cb("/login")} command to set your username`,
    },
    {
      id: "already_logged",
      text: `You already are logged into the bot; 
    use ${cb("/me")} to see your username 
    and ${cb("/logout")} to logout.`,
    },
    {
      id: "lastfm_error",
      text: "Something went wrong while trying to fetch information from Last.fm.",
    },
    {
      id: "exception",
      text: `Something went wrong; please try again, and drop a note in the support server if this issue persists (see ${cb(
        "/about"
      )} or ${cb("/reportbug")}).`,
    },

    {
      id: "spotify_connect",
      text: "Something went wrong while connecting to the Spotify API to fetch the cover images.",
    },
  ] as const;

  get(id: typeof this.templates[number]["id"]) {
    const template = this.templates.find((t) => t.id === id);
    return template?.text || "Unknown error code";
  }
}
