import truncate_str from "./truncate";

/**
 * Escapes Discord's markdown characters.
 * @param text
 * @param truncate Truncates string, *after* "escaping", to 25 chars if set to true.
 * @returns
 */
export default function esm(text: string, truncate = false) {
  // https://stackoverflow.com/questions/39542872/escaping-discord-subset-of-markdown

  /* replace backticks (`) with single-quotes (') */
  const unescaped = text.replace(/[`]/g, "'");

  // .replace(/\\(\*|_|`|~|\\)/g, "$1"); // unescape any "backslashed" character
  const escaped = unescaped.replace(/(\*|_|`|~|\\)/g, "\\$1").trim(); // escape *, _, `, ~, \

  return truncate ? truncate_str(escaped, 25) : escaped;
}
