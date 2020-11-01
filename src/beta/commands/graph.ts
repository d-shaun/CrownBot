import { CanvasRenderService } from "chartjs-node-canvas";
import { Message, MessageAttachment } from "discord.js";
import Command from "../../classes/Command";
import { Template } from "../../classes/Template";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import LastFMUser from "../../handlers/LastFMUser";
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
      usage: ["graph <time_period>"],
      aliases: ["gp", "grp"],
      examples: ["graph week", "graph month", "graph year", "graph alltime"],
      require_login: true,
      category: "userstat",
    });
  }

  async run(client: CrownBot, message: Message, args: string[]) {
    const server_prefix = client.get_cached_prefix(message);
    const response = new BotMessage({ client, message, text: "", reply: true });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild?.id, message.author.id);
    if (!user) return;
    const lastfm_user = new LastFMUser({
      discord_ID: message.author.id,
      username: user.username,
    });

    let period: string | undefined = "LAST_7_DAYS";
    if (args.length !== 0) {
      switch (args[0]) {
        case `a`:
        case `alltime`:
        case `o`:
        case `overall`:
          period = "ALL";
          break;
        case `w`:
        case `weekly`:
        case `week`:
          period = "LAST_7_DAYS";
          break;
        case `monthly`:
        case `month`:
        case `m`:
          period = "LAST_30_DAYS";
          break;
        case `yearly`:
        case `year`:
        case `y`:
          period = "LAST_365_DAYS";
          break;
        default:
          period = undefined;
          break;
      }
    }
    if (!period) {
      response.text = `Invalid time-period provided; see ${cb(
        "help graph",
        server_prefix
      )}.`;
      await response.send();
      return;
    }

    const stats = await lastfm_user.get_listening_history(period);
    if (!stats) {
      response.text = new Template(client, message).get("lastfm_error");
      await response.send();
      return;
    }

    const graph_image_buffer = await this.generate_graph(stats);
    const attachment = new MessageAttachment(graph_image_buffer, "graph.jpg");
    message.reply(`here's your ${cb(period)} scrobble graph.`, attachment);
  }

  async generate_graph(stats: GraphStat[], width = 800, height = 400) {
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
        legend: {
          display: false,
        },
      },
      data: {
        labels: stats.map((point) => point.date),
        datasets: [
          {
            borderColor: "#07ad79",
            data: stats.map((point) => point.playcount),
            backgroundColor: [
              "#192333",
              "#103559",
              "#1156b4",
              "#2dc0b7",
              "#1e2632",
              "#5a503f",
              "#a8824e",
            ],
          },
        ],
      },
    };
    return canvasRenderService.renderToBuffer(configuration, "image/jpeg");
  }
}

export default GraphCommand;
