export default function esm(text: string) {
  // escape Discord subset of markdown characters
  // https://stackoverflow.com/questions/39542872/escaping-discord-subset-of-markdown

  /* replace backticks (`) with single-quotes (') */
  const unescaped = text.replace(/[`]/g, "'");

  // .replace(/\\(\*|_|`|~|\\)/g, "$1"); // unescape any "backslashed" character
  const escaped = unescaped.replace(/(\*|_|`|~|\\)/g, "\\$1"); // escape *, _, `, ~, \

  return escaped;
}
