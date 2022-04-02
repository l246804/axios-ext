/**
 * Determines whether the specified URL is absolute
 *
 * @param url The URL to test
 * @returns True if the specified URL is absolute, otherwise false
 */
export function isAbsoluteURL(url: string) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)
}

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param baseURL The base URL
 * @param relativeURL The relative URL
 * @returns The combined URL
 */
export function combineURLs(baseURL = '', relativeURL = '') {
  return relativeURL ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '') : baseURL
}
