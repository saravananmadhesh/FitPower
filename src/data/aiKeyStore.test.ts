import { beforeEach, describe, expect, it } from 'vitest';
import { legacyPlan, legacyProfile } from '@/domain/plans/legacy';
import { localRepository } from './localRepository';
import { AI_KEY_STORAGE_KEY, loadAiKey, maskKey, removeAiKey, saveAiKey } from './aiKeyStore';

const config = {
  provider: 'anthropic' as const,
  apiKey: 'sk-ant-secret-1234',
  model: 'claude-sonnet-5-5',
  baseUrl: 'https://api.anthropic.com',
  savedAt: '2026-10-16T08:00:00.000Z',
};

beforeEach(() => {
  localStorage.clear();
});

describe('aiKeyStore', () => {
  it('saves, loads and removes the key in its own storage entry', () => {
    expect(loadAiKey()).toBeNull();
    saveAiKey(config);
    expect(loadAiKey()).toEqual(config);
    removeAiKey();
    expect(loadAiKey()).toBeNull();
    expect(localStorage.getItem(AI_KEY_STORAGE_KEY)).toBeNull();
  });

  it('requires a key except for local OpenAI-compatible servers', () => {
    expect(() => saveAiKey({ ...config, apiKey: '' })).toThrow();
    expect(() =>
      saveAiKey({
        ...config,
        provider: 'openai-compatible',
        apiKey: '',
        baseUrl: 'http://localhost:11434/v1',
      }),
    ).not.toThrow();
  });

  it('ignores a corrupted entry', () => {
    localStorage.setItem(AI_KEY_STORAGE_KEY, '{not json');
    expect(loadAiKey()).toBeNull();
  });

  it('never ends up in a backup export', async () => {
    await localRepository.reset();
    await localRepository.saveProfile(legacyProfile('2026-10-16', '2026-10-16'));
    await localRepository.savePlan(legacyPlan('2026-10-16'));
    saveAiKey(config);
    const backup = JSON.stringify(await localRepository.exportBackup());
    expect(backup).not.toContain(config.apiKey);
    expect(backup).not.toContain(AI_KEY_STORAGE_KEY);
  });

  it('masks all but the last 4 characters', () => {
    expect(maskKey('sk-ant-secret-1234')).toBe('••••1234');
    expect(maskKey('abc')).toBe('••••');
  });
});
