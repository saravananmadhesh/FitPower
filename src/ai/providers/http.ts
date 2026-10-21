import { AiProviderError } from '../types';

/** Maps a failed HTTP response to an `AiProviderError` with the provider's own message. */
export async function errorForStatus(res: Response): Promise<AiProviderError> {
  let detail = '';
  try {
    const raw: unknown = await res.json();
    // Gemini's OpenAI-compatible endpoint wraps the error in an array.
    const body = (Array.isArray(raw) ? raw[0] : raw) as
      { error?: { message?: string } | string } | undefined;
    const error = body?.error;
    detail = typeof error === 'string' ? error : (error?.message ?? '');
  } catch {
    // Not JSON; the status code is enough.
  }
  const message = detail || `HTTP ${res.status}`;
  if (res.status === 401 || res.status === 403) {
    return new AiProviderError(message, 'auth', res.status);
  }
  if (res.status === 429) return new AiProviderError(message, 'rate-limit', res.status);
  if (res.status >= 500) return new AiProviderError(message, 'server', res.status);
  return new AiProviderError(message, 'bad-response', res.status);
}
