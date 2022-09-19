import cb from "../misc/codeblock";
export class Template {
  templates: { id: string; text: string }[];
  constructor() {
    this.templates = [
      {
        id: "not_logged",
        text:
          `You are not logged into the bot on this server; ` +
          `please set your Last.fm username with the ` +
          `${cb("/login")} commmand.`,
      },
      {
        id: "already_logged",
        text: `You already are logged into the bot; 
        send ${cb("/me")} to see your username 
        and ${cb("/logout")} to logout.`,
      },
      {
        id: "lastfm_error",
        text: "Something went wrong while trying to fetch info from Last.fm.",
      },
      {
        id: "exception",
        text: `Something went wrong; please try again, and drop a note in the support server if this issue persists (see ${cb(
          "/support"
        )}).`,
      },
    ];
  }

  get(id: string): string {
    const template = this.templates.find((t) => t.id === id);
    if (!template) {
      throw "No template with the ID found: " + id;
    }
    return template.text;
  }
}
