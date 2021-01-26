import { MessageAttachment } from "discord.js";
import puppeteer from "puppeteer";
import Command, { GuildMessage } from "../../classes/Command";
import BotMessage from "../../handlers/BotMessage";
import CrownBot from "../../handlers/CrownBot";
import DB from "../../handlers/DB";
import cb from "../../misc/codeblock";
class ReportCommand extends Command {
  constructor() {
    super({
      name: "report",
      description:
        "Shows user's listening report captured from the Reports section on Last.fm.",
      usage: ["report <week/year>"],
      aliases: ["rp"],
      examples: ["report week"],
      require_login: true,
      owner_only: true,
      hidden: true,
    });
  }

  async run(client: CrownBot, message: GuildMessage, args: string[]) {
    const server_prefix = client.cache.prefix.get(message.guild);
    const response = new BotMessage({
      client,
      message,
      reply: true,
    });
    const db = new DB(client.models);
    const user = await db.fetch_user(message.guild.id, message.author.id);
    if (!user) return;
    const config = {
      period: {
        value: <"week" | "year" | undefined>"week",
      },
    };
    let screenshot;
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    page.setViewport({ width: 1900, height: 1080 });

    switch (args[0]) {
      case "w":
      case "week":
      case "weekly":
        config.period.value = "week";
        break;

      case "y":
      case "year":
      case "yearly":
        config.period.value = "year";
        break;

      case undefined:
        break;

      default:
        config.period.value = undefined;
        break;
    }

    if (!config.period.value) {
      response.text = `Invalid time period; see ${cb(
        "help report",
        server_prefix
      )}.`;
      await response.send();
      return;
    }

    try {
      await page.goto(
        `https://www.last.fm/user/${user.username}/listening-report/${config.period.value}`,
        { timeout: 60000 }
      );

      const elements_to_remove = [
        ".top-bar",
        "nav",
        ".header",
        "#onetrust-consent-sdk",
        ".listening-report-library-link",
        ".user-dashboard-buffer",
      ];

      await page.evaluate((elems: string[]) => {
        for (const elem of elems) {
          const elements = document.querySelectorAll(elem);
          for (let i = 0; i < elements.length; i++) {
            // keep the first two .user-dashboard-buffer elements (including the header,
            // which makes it technically 3 elements)
            if (elem === ".user-dashboard-buffer" && i <= 2) continue;

            elements[i].parentNode?.removeChild(elements[i]);
          }
        }
      }, elements_to_remove);

      const dashboard = await page.$(".user-dashboard--weekly");

      if (dashboard) {
        screenshot = await dashboard.screenshot();
      }
    } catch (e) {
      await browser.close();
      await response.error("lastfm_error");
      return;
    }
    await browser.close();
    if (screenshot) {
      const attachment = new MessageAttachment(screenshot, "report.png");
      message.reply(attachment);
    } else {
      await response.error("lastfm_error");
    }
  }
}

export default ReportCommand;
