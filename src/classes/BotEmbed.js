const { RichEmbed } = require("discord.js");

module.exports = class extends RichEmbed {
  constructor(message) {
    super();
    this.setColor(message.member.displayColor);
  }
};
