import type { AiKeyConfig } from '@/data/aiKeyStore';
import type { AiProvider } from '../types';
import { createAnthropicProvider } from './anthropic';
import { createOpenAiCompatibleProvider } from './openaiCompatible';

/** Builds the adapter for the user's saved provider choice. */
export function providerFor(config: AiKeyConfig): AiProvider {
  if (config.provider === 'anthropic') {
    return createAnthropicProvider({
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
    });
  }
  return createOpenAiCompatibleProvider({
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: config.baseUrl,
  });
}
