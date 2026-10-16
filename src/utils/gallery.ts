/** Catalog image paths are relative to public/ (e.g. "exercises/Goblet_Squat/0.webp"). */
export function exerciseImageUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

/** Scores are one-decimal numbers; show "9" and "7.5", localized. */
export function formatScore(score: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(score);
}
