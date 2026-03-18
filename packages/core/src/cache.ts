import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { ScanCache, IconShelfConfig } from './types.js';

export const CACHE_VERSION = '1';

// ─── Content hash ───────────────────────────────────────────

export async function computeContentHash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// ─── Config hash ────────────────────────────────────────────

export function computeConfigHash(config: IconShelfConfig): string {
  const relevant = {
    include: config.include,
    exclude: config.exclude,
    extensions: config.extensions,
    categoryStrategy: config.categoryStrategy,
  };
  return createHash('sha256')
    .update(JSON.stringify(relevant))
    .digest('hex')
    .slice(0, 16);
}

// ─── Cache persistence ─────────────────────────────────────

export async function loadCache(cachePath: string): Promise<ScanCache | null> {
  try {
    const { Packr } = await import('msgpackr');
    const packr = new Packr({ mapsAsObjects: true });
    const data = await fs.readFile(cachePath);
    return packr.unpack(data) as ScanCache;
  } catch {
    return null;
  }
}

export async function saveCache(cachePath: string, cache: ScanCache): Promise<void> {
  const { Packr } = await import('msgpackr');
  const packr = new Packr({ mapsAsObjects: true });
  const packed = packr.pack(cache);
  await fs.writeFile(cachePath, packed);
}
