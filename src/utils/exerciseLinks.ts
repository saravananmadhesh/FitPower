function cleanName(name: string): string {
  return name.replace(/\(.*?\)/g, '').trim();
}

export function howToSearchUrl(name: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${cleanName(name)} exercise form`)}`;
}

export function videoSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${cleanName(name)} exercise how to`)}`;
}
