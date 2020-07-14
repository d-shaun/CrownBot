import { Message } from "discord.js";
import CrownBot from "../handlers/CrownBot";
import cb from "../misc/codeblock";
export class Template {
  templates: { id: string; text: string }[];
  constructor(client: CrownBot, message: Message) {
    const prefix = client.get_cached_prefix(message);
    this.templates = [
      {
        id: "not_logged",
        text: `You are not logged-in to the bot;
        please set your Last.fm username with the 
        ${cb("login", prefix)} commmand (see ${cb("help login", prefix)}).`,
      },
      {
        id: "already_logged",
        text: `You already are logged-in to the bot; 
        send ${cb("me", prefix)} to see your username 
        and ${cb("logout", prefix)} to logout.`,
      },
      {
        id: "lastfm_error",
        text: "Something went wrong while trying to fetch info from Last.fm.",
      },
      {
        id: "exception",
        text: `Something went wrong; please try again, and drop a note in the support server if this issue persists (see ${cb(
          "support",
          prefix
        )}).`,
      },
    ];
  }

  get(id: string): string {
    const template = this.templates.find((t) => t.id === id);
    if (!template) {
      throw "No template with the ID found: " + id;
    }
    return template.text.split("\n").join("");
  }
}
