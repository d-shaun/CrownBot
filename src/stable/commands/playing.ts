import { AxiosResponse } from "axios";
import { FieldsEmbed } from "discord-paginationembed";
import { GuildMember, Message, TextChannel } from "discord.js";
import Command from "../../classes/Command";
import CrownBot from "../../handlers/CrownBot";
import BotMessage from "../../handlers/BotMessage";
import DB from "../../handlers/DB";
import get_registered_users from "../../misc/get_registered_users";
import cb from "../../misc/codeblock";
import { LastFM } from "../../handlers/LastFM";
import { RecentTrackInterface } from "../../interfaces/TrackInterface";

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

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const response = new BotMessage({
      client,
      message,
      reply: true,
      text: "",
    });
    const db = new DB(client.models);

    let users = (await get_registered_users(client, message))?.users;
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
        discord_user: message.guild?.members.cache.find(
          (e) => e.id === user.userID
        ),
        lastfm_username: user.username,
      };
      lastfm_requests.push(
        new LastFM()
          .query({
            method: "user.getrecenttracks",
            params: {
              user: user.username,
              limit: 1,
            },
          })
          .then((res) => {
            res.data.context = context;
            return res;
          })
      );
    }
    let responses: AxiosResponse[] = [];
    await Promise.all(lastfm_requests).then((res) => (responses = res));
    responses = responses
      .filter((response: AxiosResponse) => response.status === 200)
      .filter((response) => {
        let last_track = response.data.recenttracks.track[0];
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
      let last_track = response.data.recenttracks.track[0];

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
        const artist_url =
          "https://www.last.fm/music/" + encodeURI(track.artist["#text"]);
        const str = `**${user.user.username}**\n[${track.name}](${track.url}) · ${track.album["#text"]} — **${track.artist["#text"]}**\n`;
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