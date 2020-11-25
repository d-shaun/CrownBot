export default function cb(text: string, prefix?: string) {
  /* replace backticks (`) with single-quotes (') */
  const escaped = text.replace(/[`]/g, "'").trim();
  return "``" + (prefix ? prefix : "") + escaped + "``";
}
