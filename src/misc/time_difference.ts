import moment from "moment";

export default function time_difference(timestamp: number): string {
  const then = moment.utc(timestamp);
  const now = moment();

  const days = now.diff(then, "days");
  const hours = now.subtract(days, "days").diff(then, "hours");
  const minutes = now.subtract(hours, "hours").diff(then, "minutes");

  const string = `${days > 0 ? days + " day(s)" : ""} ${
    hours > 0 ? hours + " hour(s)" : ""
  } ${days < 1 && hours < 1 && minutes > 0 ? minutes + " minute(s)" : ""} ${
    days < 1 && hours < 1 && minutes < 1 ? "less than a minute" : ""
  }
  `.trim();
  return string;
}
