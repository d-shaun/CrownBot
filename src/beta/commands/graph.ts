import { CanvasRenderService } from "chartjs-node-canvas";
import { MessageAttachment } from "discord.js";
import Command, { GuildMessage } from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import { LastFM } from "../../handlers/LastFM";
import LastFMUser from "../../handlers/LastFMUser";
import { ArtistInterface } from "../../interfaces/ArtistInterface";
import cb from "../../misc/codeblock";
interface GraphStat {
  date: string;
  playcount: number;
}
class GraphCommand extends Command {
  constructor() {
    super({
      name: "graph",
      description:
        "Graphs user's last week, month, or year's, or all-time playing stats; defaults to week.",
      usage: ["graph <time_period> [<artist_name> or np]"],
      aliases: ["gp", "grp"],
      examples: [
        "graph week",
        "graph month The Strokes",
        "graph year np",
        "graph alltime",
      ],
      require_login: true,
      category: "userstat",
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = client.cache.prefix.get(message.guild);
    const response = new BotMessage({ client, message, text: "", reply: true });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild?.id, message.author.id);
    if (!user) return;
    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    const config = {
      period: {
        value: <undefined | string>"LAST_7_DAYS",
        text: "last 7 days",
      },
      artist_name: <undefined | string>undefined,
    };

    if (args[0]) {
      switch (args[0]) {
        case `a`:
        case `all`:
        case `alltime`:
        case `o`:
        case `overall`:
          config.period.value = "ALL";
          config.period.text = "all-time";
          break;
        case `w`:
        case `weekly`:
        case `week`:
          config.period.value = "LAST_7_DAYS";
          config.period.text = "last 7 days";
          break;
        case `monthly`:
        case `month`:
        case `m`:
          config.period.value = "LAST_30_DAYS";
          config.period.text = "last 30 days";
          break;
        case `yearly`:
        case `year`:
        case `y`:
          config.period.value = "LAST_365_DAYS";
          config.period.text = "last 365 days";
          break;
        default:
          config.period.value = undefined;
          break;
      }
    }

    if (args[1]) {
      /* artist name */
      let artist_name: string;
      if (args[1] === "np") {
        const now_playing = await lastfm_user.get_nowplaying(client, message);
        if (!now_playing) return;
        artist_name = now_playing.artist["#text"];
      } else {
        const raw_artist_name = args.slice(1).join(" ");
        const { status, data } = await new LastFM().query({
          method: "artist.getinfo",
          params: {
            artist: raw_artist_name,
            autocorrect: 1,
          },
        });

        if (data.error || !data.artist) {
          response.text = new Template(client, message).get("lastfm_error");
          await response.send();
          return;
        }
        const artist: ArtistInterface = data.artist;
        artist_name = artist.name;
      }
      config.artist_name = artist_name;
    }

    if (!config.period.value) {
      response.text = `Invalid time-period provided; see ${cb(
        "help graph",
        server_prefix
      )}.`;
      await response.send();
      return;
    }

    const stats = await lastfm_user.get_listening_history(
      config.period.value,
      config.artist_name
    );
    if (!stats) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    const graph_image_buffer = await this.generate_graph(
      stats,
      undefined,
      undefined,
      config.artist_name
    );
    const attachment = new MessageAttachment(graph_image_buffer, "graph.jpg");
    let artist_text = "";
    if (config.artist_name) {
      artist_text = `(Artist: \`${config.artist_name}\`)`;
    }
    let reply_message = `here's your scrobble graph for the **${config.period.text}**. ${artist_text}`;
    if (config.period.value === "ALL") {
      reply_message = `here's your all-time scrobble graph. ${artist_text}`;
    }
    message.reply(reply_message, attachment);
  }

  async generate_graph(
    stats: GraphStat[],
    width = 800,
    height = 400,
    artist_name?: undefined | string
  ) {
    const canvasRenderService = new CanvasRenderService(
      width,
      height,
      (ChartJS) => {
        ChartJS.plugins.register({
          afterDraw: function (chartInstance: any) {
            var ctx = chartInstance.chart.ctx;
            ctx.font = ChartJS.helpers.fontString(
              ChartJS.defaults.global.defaultFontSize,
              "normal",
              ChartJS.defaults.global.defaultFontFamily
            );
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillStyle = `white`;

            chartInstance.data.datasets.forEach(function (dataset: any) {
              for (var i = 0; i < dataset.data.length; i++) {
                var model =
                  dataset._meta[Object.keys(dataset._meta)[0]].data[i]._model;
                ctx.fillText(dataset.data[i] + " plays", model.x, model.y - 2);
              }
            });
          },
        });
      }
    );

    const configuration = {
      type: "line",
      options: {
        layout: {
          padding: {
            top: 30,
            left: 15,
            bottom: 15,
            right: 15,
          },
        },
        legend: {
          display: false,
        },
        title: {
          display: !!artist_name,
          text: artist_name,
        },
      },
      data: {
        labels: stats.map((point) => point.date),
        datasets: [
          {
            borderColor: "#07ad79",
            data: stats.map((point) => point.playcount),
          },
        ],
      },
    };
    return canvasRenderService.renderToBuffer(configuration, "image/jpeg");
  }
}

export default GraphCommand;
