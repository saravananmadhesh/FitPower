type LogFields = Record<string, unknown> | undefined;

/**
 * Thin console wrapper — the single seam to swap in a real telemetry
 * sink (Sentry) later without touching call sites. See CLAUDE.md
 * "Error handling & observability".
 */
export const logger = {
  info(message: string, fields?: LogFields): void {
    console.info(message, fields ?? '');
  },
  warn(message: string, fields?: LogFields): void {
    console.warn(message, fields ?? '');
  },
  error(message: string, error?: unknown, fields?: LogFields): void {
    console.error(message, error ?? '', fields ?? '');
  },
};
