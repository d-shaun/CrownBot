// Global constants used throughout the bot
export default {
  VERSION: "11.2.0",
  BUTTONS_VERSION: "001", // update this to invalidate existing buttons
  MAX_USERS: 250, // max user limit per server
  LASTFM_ENDPOINT: "https://ws.audioscrobbler.com/2.0/?",
  SUPPORT_SERVER: "https://discord.gg/4vU6kGhejv",
  SUPPORT_SERVER_ID: "1001517710917767188",

  GENERAL_TIMEOUT: 300000, // ms -> 5 minutes

  PAGINATE_TIMEOUT: 300000, // ms -> 5 minutes
  PAGINATE_ELEMENTS: 15,

  RETRY_BUTTON_TIMEOUT: 600000, // ms -> 10 minutes
};
