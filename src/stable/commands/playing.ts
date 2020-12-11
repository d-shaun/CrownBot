import { FieldsEmbed } from "discord-paginationembed";
import { GuildMember, TextChannel } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import { LastFM, ResponseInterface } from "../../handlers/LastFM";
import { RecentTrackInterface } from "../../interfaces/TrackInterface";
import cb from "../../misc/codeblock";
import esm from "../../misc/escapemarkdown";
import get_registered_users from "../../misc/get_registered_users";
class PlayingCommand extends Command {
  constructor() {
    super({
      name: "playing",
      description:
        "Displays list of songs being played in a server by registered users.",
      usage: ["playing"],
      aliases: ["pl", "play"],
      category: "serverstat",
    });
  }

  async run(client: CrownBot, message: GuildMessage) {
    const server_prefix = client.cache.prefix.get(message.guild);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });

    const users = (await get_registered_users(client, message))?.users;
    if (!users || users.length <= 0) {
      response.text = `No user in this guild has registered their Last.fm username; see ${cb(
        "help login",
        server_prefix
      )}`;
      await response.send();
      return;
    }

    if (users.length > 100) {
      users.length = 100; // 100 user limit
    }
    const lastfm_requests = [];
    for await (const user of users) {
      const context = {
        discord_user: user.discord,
        lastfm_username: user.database.username,
      };
      lastfm_requests.push(
        new LastFM()
          .query({
            method: "user.getrecenttracks",
            params: {
              user: user.database.username,
              limit: 1,
            },
          })
          .then((res) => {
            res.data.context = context;
            return res;
          })
      );
    }
    let responses: ResponseInterface[] = [];
    await Promise.all(lastfm_requests).then((res) => (responses = res));
    responses = responses
      .filter((response) => response.status === 200)
      .filter((response) => {
        const last_track = response.data.recenttracks.track[0];
        return (
          last_track && last_track[`@attr`] && last_track[`@attr`].nowplaying
        );
      });

    if (!responses.length) {
      response.text =
        "No one in this server is playing anything (or Last.fm is down).";
      await response.send();
      return;
    }
    const stats = responses.map((response) => {
      const last_track = response.data.recenttracks.track[0];

      return {
        track: last_track,
        context: response.data.context,
      };
    });
    const fields_embed = new FieldsEmbed()
      .setArray(stats)
      .setAuthorizedUsers([])
      .setChannel(<TextChannel>message.channel)
      .setElementsPerPage(5)
      .setPageIndicator(true, "hybrid")
      .setDisabledNavigationEmojis(["delete"])
      .formatField(`${stats.length} user(s)`, (el: any) => {
        const track: RecentTrackInterface = el.track;
        const user: GuildMember = el.context.discord_user;

        const str = `**${esm(user.user.username)}**\n[${esm(track.name)}](${
          track.url
        }) · ${esm(track.album["#text"])} — **${esm(
          track.artist["#text"]
        )}**\n`;
        return str.substring(0, 1020);
      });

    fields_embed.embed
      .setColor(message.member?.displayColor || "000000")
      .setTitle(`What is being played in ${message.guild?.name}?`);
    fields_embed.on("start", () => {
      message.channel.stopTyping(true);
    });
    await fields_embed.build();
  }
}

export default PlayingCommand;
