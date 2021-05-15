/**
 * Function to truncate string to n-size.
 * @param str String to truncate
 * @param n
 * @returns Truncated string
 */

export default function truncate_str(str: string, n: number) {
  return str.length > n ? str.substr(0, n - 1) + "..." : str;
}
