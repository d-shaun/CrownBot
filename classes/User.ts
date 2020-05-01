export default class User {
  username: string;
  user_ID: number;
  lastfm_username: string;
  constructor(options: User) {
    this.username = options.username;
    this.user_ID = options.user_ID;
    this.lastfm_username = options.lastfm_username;
  }
}
