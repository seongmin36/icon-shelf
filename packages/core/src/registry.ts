import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  IconShelfConfig,
  IconEntry,
  IconRegistry,
  CategoryMeta,
  ScanCache,
  CachedEntry,
} from './types.js';
import { parseIconFile, fileNameToTags } from './parser.js';
import {
  loadCache,
  saveCache,
  computeContentHash,
  computeConfigHash,
  CACHE_VERSION,
} from './cache.js';

export interface GenerateOptions {
  config: IconShelfConfig;
  cwd: string;
}

// ─── Category Resolution ────────────────────────────────────

function resolveCategory(
  filePath: string,
  config: IconShelfConfig,
  cwd: string,
): string {
  if (config.categoryStrategy === 'none') return 'uncategorized';

  if (config.categoryStrategy === 'directory') {
    for (const include of config.include) {
      const includePath = path.resolve(cwd, include);
      const relative = path.relative(includePath, filePath);
      if (!relative.startsWith('..')) {
        const parts = relative.split(path.sep);
        return parts.length > 1 ? parts[0] : 'uncategorized';
      }
    }
    return 'uncategorized';
  }

  if (config.categoryStrategy === 'prefix') {
    const name = path.basename(filePath, path.extname(filePath));
    const match = name.match(/^([a-z]+)[-_]/i);
    return match ? match[1].toLowerCase() : 'uncategorized';
  }

  return 'uncategorized';
}

// ─── Build category metadata ────────────────────────────────

function buildCategoryMeta(entries: IconEntry[]): CategoryMeta[] {
  const map = new Map<string, number>();
  for (const entry of entries) {
    map.set(entry.category, (map.get(entry.category) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, count }));
}

// ─── Main Registry Generator ────────────────────────────────

export async function generateRegistry(
  files: string[],
  options: GenerateOptions,
): Promise<IconRegistry> {
  const { config, cwd } = options;

  // Load cache
  const cachePath = path.resolve(cwd, config.cache.path);
  let cache: ScanCache | null = null;

  if (config.cache.enabled) {
    cache = await loadCache(cachePath);
    const configHash = computeConfigHash(config);

    if (cache && (cache.configHash !== configHash || cache.version !== CACHE_VERSION)) {
      cache = null;
    }
  }

  const entries: IconEntry[] = [];
  const newCacheEntries: Record<string, CachedEntry> = {};
  const configHash = computeConfigHash(config);

  for (const filePath of files) {
    const cached = cache?.entries[filePath];

    try {
      const stat = await fs.stat(filePath);

      // Stage 1: mtime match
      if (cached && cached.mtime === stat.mtimeMs) {
        entries.push(cached.iconEntry);
        newCacheEntries[filePath] = cached;
        continue;
      }

      // Stage 2: content hash match
      const contentHash = await computeContentHash(filePath);
      if (cached && cached.contentHash === contentHash) {
        const updated: CachedEntry = { ...cached, mtime: stat.mtimeMs };
        entries.push(updated.iconEntry);
        newCacheEntries[filePath] = updated;
        continue;
      }

      // Cache miss: full parse
      const parsed = await parseIconFile(filePath, cwd);
      const ext = path.extname(filePath);
      const baseName = path.basename(filePath, ext);
      const category = resolveCategory(filePath, config, cwd);
      const tags = fileNameToTags(baseName);
      const id = `${category}/${baseName}`;

      const entry: IconEntry = {
        ...parsed,
        id,
        category,
        tags,
        contentHash,
      };

      entries.push(entry);
      newCacheEntries[filePath] = {
        path: filePath,
        mtime: stat.mtimeMs,
        contentHash,
        iconEntry: entry,
      };
    } catch {
      // Skip files that can't be read
      continue;
    }
  }

  // Save cache
  if (config.cache.enabled) {
    await saveCache(cachePath, {
      version: CACHE_VERSION,
      configHash,
      entries: newCacheEntries,
    });
  }

  // Build registry
  const categories = buildCategoryMeta(entries);

  const registry: IconRegistry = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalCount: entries.length,
    categories,
    icons: entries,
  };

  // Write registry file
  const outputPath = path.resolve(cwd, config.output.registry);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(registry, null, 2));

  return registry;
}
