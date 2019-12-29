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
