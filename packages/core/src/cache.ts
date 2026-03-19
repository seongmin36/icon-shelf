import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Packr } from 'msgpackr';
import type { ScanCache, IconShelfConfig } from './types.js';

export const CACHE_VERSION = '1';

// msgpackr 인스턴스를 한 번만 생성하여 재사용
const packr = new Packr({ mapsAsObjects: true });

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
    const data = await fs.readFile(cachePath);
    return packr.unpack(data) as ScanCache;
  } catch {
    return null;
  }
}

export async function saveCache(cachePath: string, cache: ScanCache): Promise<void> {
  const packed = packr.pack(cache);
  await fs.writeFile(cachePath, packed);
}
