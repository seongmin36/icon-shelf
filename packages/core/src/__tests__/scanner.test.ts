import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { scanFiles } from '../scanner.js';
import { DEFAULT_CONFIG } from '../config.js';
import type { IconShelfConfig } from '../types.js';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

function makeConfig(overrides: Partial<IconShelfConfig> = {}): IconShelfConfig {
  return {
    ...DEFAULT_CONFIG,
    include: ['icons'],
    ...overrides,
  };
}

describe('scanFiles', () => {
  it('finds all SVG files in fixtures', async () => {
    const config = makeConfig({ extensions: ['.svg'] });
    const { files } = await scanFiles(config, FIXTURES_DIR);

    expect(files.length).toBeGreaterThanOrEqual(7);
    expect(files.every((f) => f.endsWith('.svg'))).toBe(true);
  });

  it('filters by extension', async () => {
    const config = makeConfig({ extensions: ['.png'] });
    const { files } = await scanFiles(config, FIXTURES_DIR);

    expect(files.every((f) => f.endsWith('.png'))).toBe(true);
  });

  it('returns absolute paths sorted', async () => {
    const config = makeConfig();
    const { files } = await scanFiles(config, FIXTURES_DIR);

    for (const f of files) {
      expect(path.isAbsolute(f)).toBe(true);
    }

    const sorted = [...files].sort();
    expect(files).toEqual(sorted);
  });

  it('respects exclude patterns', async () => {
    const config = makeConfig({ exclude: ['**/bad-icons/**'] });
    const { files } = await scanFiles(config, FIXTURES_DIR);

    expect(files.some((f) => f.includes('bad-icons'))).toBe(false);
  });

  it('returns empty for non-existent directory', async () => {
    const config = makeConfig({ include: ['nonexistent'] });
    const { files } = await scanFiles(config, FIXTURES_DIR);

    expect(files).toEqual([]);
  });

  it('reports scan duration', async () => {
    const config = makeConfig();
    const { scanDurationMs } = await scanFiles(config, FIXTURES_DIR);

    expect(scanDurationMs).toBeGreaterThanOrEqual(0);
  });
});
