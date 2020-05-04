import moment from "moment";

export default function time_difference(timestamp: number): string {
  var then = moment.utc(timestamp);
  var now = moment();

  let days = now.diff(then, "days");
  let hours = now.subtract(days, "days").diff(then, "hours");
  let minutes = now.subtract(hours, "hours").diff(then, "minutes");

  const string = `${days > 0 ? days + " day(s)" : ""} ${
    hours > 0 ? hours + " hour(s)" : ""
  } ${days < 1 && hours < 1 && minutes > 0 ? minutes + " minute(s)" : ""} ${
    days < 1 && hours < 1 && minutes < 1 ? "less than a minute" : ""
  }
  `.trim();
  return string;
}
