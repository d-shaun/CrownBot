class Command {
  constructor(options) {
    this.name = options.name;
    this.description = options.description;
    this.usage = options.usage || [];
    this.aliases = options.aliases || [];
    this.hidden = options.hidden;
    this.ownerOnly = options.ownerOnly;
  }

  async execute(client, message, args) {
    const { notify } = client.helpers;
    const is_banned_user = await client.models.bans.findOne({
      userID: message.author.id,
      guildID: { $in: [message.guild.id, "any"] }
    });

    if (
      is_banned_user &&
      this.name !== "about" &&
      message.author.id !== client.ownerID
    ) {
      if (is_banned_user.guildID === "any") {
        await notify({
          message,
          title: "Globally banned",
          description:
            "You are globally banned from accessing the bot; try `&about` to find the support server.",
          reply: true
        });
      } else {
        await notify({
          message,
          title: "User banned",
          description: "You are banned from accessing the bot in this guild.",
          reply: true
        });
      }
      return;
    }
    try {
      await this.run(client, message, args);
      await this.log(message);
    } catch (e) {
      console.error(e);
      await this.log(message, e.stack);
    }
  }

  async log(message, stack) {
    const data = {
      command_name: this.name,
      message_content: `(${message.id}) ${message.content}`,
      executor: `${message.author.tag} (${message.author.id})`,
      guild: `${message.guild.name} (${message.guild.id})`,
      channel: `${message.channel.name} (${message.channel.id})`,
      timestamp: `${new Date().toUTCString()}`,
      stack: `${stack || `none`}`
    };

    message.client.addLog(data);
  }
}

module.exports = Command;
