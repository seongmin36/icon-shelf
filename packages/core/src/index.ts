// Types
export type {
  IconShelfConfig,
  UserConfig,
  IconEntry,
  IconRegistry,
  CategoryMeta,
  LintWarning,
  LintRule,
  LintSeverity,
  ScanCache,
  CachedEntry,
  WatchEvent,
  WatchCallback,
  ScanResult,
  OutputConfig,
  CacheConfig,
  WatchConfig,
  OptimizeConfig,
  CategoryStrategy,
  OptimizeResult,
} from './types.js';

// Config
export { defineConfig, loadConfig } from './config.js';

// Core functions
export { scanFiles } from './scanner.js';
export { parseIconFile, fileNameToDisplayName, fileNameToTags } from './parser.js';
export { generateRegistry } from './registry.js';
export { createWatcher } from './watcher.js';
export type { WatcherHandle } from './watcher.js';
export { optimizeSvg, checkOptimizable } from './optimizer.js';

// Cache
export { loadCache, saveCache, computeContentHash, computeConfigHash } from './cache.js';

// Convenience: full pipeline
export async function run(cwd?: string) {
  const resolvedCwd = cwd ?? process.cwd();
  const { loadConfig: load } = await import('./config.js');
  const { scanFiles: scan } = await import('./scanner.js');
  const { generateRegistry: generate } = await import('./registry.js');

  const config = await load(resolvedCwd);
  const { files } = await scan(config, resolvedCwd);
  return generate(files, { config, cwd: resolvedCwd });
}
