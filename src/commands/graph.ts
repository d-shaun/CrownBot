import { CanvasRenderService } from "chartjs-node-canvas";
import { AttachmentBuilder, Client, SlashCommandBuilder } from "discord.js";
import GuildChatInteraction from "../classes/GuildChatInteraction";
import { CommandResponse } from "../handlers/CommandResponse";
import CrownBot from "../handlers/CrownBot";
import DB from "../handlers/DB";
import Artist from "../handlers/LastFM_components/Artist";
import User from "../handlers/LastFM_components/User";

interface GraphStat {
  date: string;
  playcount: number;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("graph")
    .setDescription("Graph your playing stats")

    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Time-frame for the graph")
        .setRequired(false)
        .addChoices(
          {
            name: "Last 7 days",
            value: "LAST_7_DAYS",
          },
          {
            name: "Last 30 days",
            value: "LAST_30_DAYS",
          },
          {
            name: "Last 365 days",
            value: "LAST_365_DAYS",
          },
          {
            name: "All-time",
            value: "ALL",
          }
        )
    )
    .addStringOption((option) =>
      option
        .setName("artist_name")
        .setDescription(
          "Optionally graph an artist (overall stat by default) (type 'np' for now-playing)"
        )
        .setRequired(false)
    ),

  async execute(
    bot: CrownBot,
    client: Client,
    interaction: GuildChatInteraction,
    response: CommandResponse
  ): Promise<CommandResponse> {
    response.allow_retry = true;
    const db = new DB(bot.models);
    const user = await db.fetch_user(interaction.guild.id, interaction.user.id);
    if (!user) return response.fail();
    const lastfm_user = new User({
      username: user.username,
    });

    let artist_name = interaction.options.getString("artist_name") || undefined;
    const time_frame = interaction.options.getString("time") || "LAST_7_DAYS";
    let time_text = "last 7 days";

    switch (time_frame) {
      case "ALL":
        time_text = "all-time";
        break;
      case "LAST_7_DAYS":
        time_text = "last 7 days";
        break;
      case "LAST_30_DAYS":
        time_text = "last 30 days";
        break;
      case "LAST_365_DAYS":
        time_text = "last 365 days";
        break;

      default:
        time_text = time_frame;
    }

    if (artist_name) {
      if (artist_name === "np") {
        const now_playing = await lastfm_user.new_get_nowplaying(
          interaction,
          response
        );
        if (now_playing instanceof CommandResponse) return now_playing;

        artist_name = now_playing.artist["#text"];
      } else {
        const query = await new Artist({ name: artist_name }).get_info();
        if (query.lastfm_errorcode || !query.success) {
          return response.error("lastfm_error", query.lastfm_errormessage);
        }
        const artist = query.data.artist;
        artist_name = artist.name;
      }
    }

    const stats = await lastfm_user.get_listening_history(
      time_frame,
      artist_name,
      undefined
    );
    if (!stats) {
      return response.error("lastfm_error");
    }

    const graph_image_buffer = await this.generate_graph(
      stats,
      undefined,
      undefined,
      artist_name
    );
    const attachment = new AttachmentBuilder(graph_image_buffer, {
      name: "graph.jpg",
    });
    let artist_text = "";
    if (artist_name) {
      artist_text = `(Artist: \`${artist_name}\`)`;
    }
    let reply_message = `Here's your scrobble graph for the **${time_text}**. ${artist_text}`;

    if (time_frame === "ALL") {
      reply_message = `Here's your all-time scrobble graph. ${artist_text}`;
    }

    response.text = reply_message;
    response.files = [attachment];
    return response;
  },

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
          afterDraw: (chartInstance) => {
            const ctx = chartInstance.ctx;
            if (!ctx) return;
            ctx.font = ChartJS.helpers.fontString(
              ChartJS.defaults.global.defaultFontSize,
              "normal",
              ChartJS.defaults.global.defaultFontFamily
            );
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillStyle = `white`;

            chartInstance.data.datasets?.forEach(function (dataset) {
              if (!dataset.data?.length) return;
              for (let i = 0; i < dataset.data.length; i++) {
                const model =
                  // @ts-ignore
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
  },
};
