import { describe, it, expect } from 'vitest';
import { defineConfig, DEFAULT_CONFIG } from '../config.js';

describe('defineConfig', () => {
  it('returns the user config as-is', () => {
    const userConfig = { include: ['icons/'] };
    const result = defineConfig(userConfig);
    expect(result).toEqual(userConfig);
  });
});

describe('DEFAULT_CONFIG', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_CONFIG.include).toEqual(['src/assets/icons']);
    expect(DEFAULT_CONFIG.extensions).toContain('.svg');
    expect(DEFAULT_CONFIG.extensions).toContain('.png');
    expect(DEFAULT_CONFIG.categoryStrategy).toBe('directory');
    expect(DEFAULT_CONFIG.cache.enabled).toBe(true);
    expect(DEFAULT_CONFIG.optimize.originalFilePolicy).toBe('preserve');
  });
});
