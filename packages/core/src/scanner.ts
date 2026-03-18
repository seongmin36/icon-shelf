import fg from 'fast-glob';
import path from 'node:path';
import type { IconShelfConfig, ScanResult } from './types.js';

export async function scanFiles(
  config: IconShelfConfig,
  cwd: string,
): Promise<ScanResult> {
  const start = performance.now();

  const patterns = config.include.flatMap((dir) =>
    config.extensions.map((ext) => path.join(dir, `**/*${ext}`)),
  );

  const files = await fg(patterns, {
    cwd,
    absolute: true,
    ignore: config.exclude,
    onlyFiles: true,
    followSymbolicLinks: false,
    dot: false,
  });

  return {
    files: files.sort(),
    scanDurationMs: performance.now() - start,
  };
}
