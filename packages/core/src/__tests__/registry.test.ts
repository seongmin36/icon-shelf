import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import { scanFiles } from '../scanner.js';
import { generateRegistry } from '../registry.js';
import { DEFAULT_CONFIG } from '../config.js';
import type { IconShelfConfig } from '../types.js';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const OUTPUT_PATH = path.join(FIXTURES_DIR, '__generated__', 'icon-registry.json');
const CACHE_PATH = path.join(FIXTURES_DIR, '.icon-shelf.cache');

function makeConfig(overrides: Partial<IconShelfConfig> = {}): IconShelfConfig {
  return {
    ...DEFAULT_CONFIG,
    include: ['icons'],
    extensions: ['.svg'],
    output: { registry: '__generated__/icon-registry.json' },
    cache: { enabled: false, path: '.icon-shelf.cache' },
    ...overrides,
  };
}

describe('generateRegistry', () => {
  afterEach(async () => {
    try {
      await fs.rm(path.join(FIXTURES_DIR, '__generated__'), { recursive: true });
    } catch {}
    try {
      await fs.unlink(CACHE_PATH);
    } catch {}
  });

  it('generates a valid registry JSON file', async () => {
    const config = makeConfig();
    const { files } = await scanFiles(config, FIXTURES_DIR);
    const registry = await generateRegistry(files, { config, cwd: FIXTURES_DIR });

    expect(registry.version).toBe('1.0.0');
    expect(registry.totalCount).toBe(files.length);
    expect(registry.icons.length).toBe(files.length);
    expect(registry.generatedAt).toBeTruthy();

    // Verify file was written
    const raw = await fs.readFile(OUTPUT_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.totalCount).toBe(registry.totalCount);
  });

  it('assigns categories from directory names', async () => {
    const config = makeConfig();
    const { files } = await scanFiles(config, FIXTURES_DIR);
    const registry = await generateRegistry(files, { config, cwd: FIXTURES_DIR });

    const categories = registry.categories.map((c) => c.name);
    expect(categories).toContain('navigation');
    expect(categories).toContain('actions');
    expect(categories).toContain('bad-icons');
  });

  it('generates unique IDs for each icon', async () => {
    const config = makeConfig();
    const { files } = await scanFiles(config, FIXTURES_DIR);
    const registry = await generateRegistry(files, { config, cwd: FIXTURES_DIR });

    const ids = registry.icons.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('generates tags from file names', async () => {
    const config = makeConfig();
    const { files } = await scanFiles(config, FIXTURES_DIR);
    const registry = await generateRegistry(files, { config, cwd: FIXTURES_DIR });

    const arrowLeft = registry.icons.find((i) => i.fileName === 'arrow-left.svg');
    expect(arrowLeft?.tags).toContain('arrow');
    expect(arrowLeft?.tags).toContain('left');
  });

  it('uses cache on second run', async () => {
    const config = makeConfig({ cache: { enabled: true, path: '.icon-shelf.cache' } });
    const { files } = await scanFiles(config, FIXTURES_DIR);

    // First run (cold)
    const reg1 = await generateRegistry(files, { config, cwd: FIXTURES_DIR });

    // Second run (warm — should use cache)
    const reg2 = await generateRegistry(files, { config, cwd: FIXTURES_DIR });

    expect(reg2.totalCount).toBe(reg1.totalCount);
    expect(reg2.icons.map((i) => i.id)).toEqual(reg1.icons.map((i) => i.id));
  });
});
