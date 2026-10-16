import { AiProviderError } from '../types';

/** Maps a failed HTTP response to an `AiProviderError` with the provider's own message. */
export async function errorForStatus(res: Response): Promise<AiProviderError> {
  let detail = '';
  try {
    const body = (await res.json()) as { error?: { message?: string } | string };
    detail = typeof body.error === 'string' ? body.error : (body.error?.message ?? '');
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
