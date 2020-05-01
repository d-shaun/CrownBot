export default function cb(text: string, prefix?: string) {
  return "``" + (prefix ? prefix : "") + text + "``";
}
