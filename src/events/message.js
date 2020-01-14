module.exports = async (client, message) => {
  if (!client.prefixes) {
    await client.cachePrefixes();
  }

  const server_prefix = client.getCachedPrefix(message);

  if (message.isMemberMentioned(client.user)) {
    message.reply(
      `the prefix for this server is \`\`${server_prefix}\`\`. Try \`\`${server_prefix}help\`\`.`
    );
  }

  if (
    !message.content.startsWith(server_prefix) ||
    message.channel.type !== "text" ||
    message.author.bot
  ) {
    return;
  }
  const args = message.content.slice(server_prefix.length).split(/ +/gi);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.find(
    x => x.name === commandName || x.aliases.includes(commandName)
  );
  if (!command) {
    return;
  }
  await command.execute(client, message, args);
};
