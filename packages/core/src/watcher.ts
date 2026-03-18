import path from 'node:path';
import type { IconShelfConfig, IconRegistry, WatchCallback } from './types.js';
import { scanFiles } from './scanner.js';
import { generateRegistry } from './registry.js';

export interface WatcherHandle {
  close: () => Promise<void>;
}

export async function createWatcher(options: {
  config: IconShelfConfig;
  cwd: string;
  onUpdate: WatchCallback;
}): Promise<WatcherHandle> {
  const { config, cwd, onUpdate } = options;

  const { watch } = await import('chokidar');

  const watchPaths = config.include.map((p) => path.resolve(cwd, p));
  const validExts = new Set(config.extensions);

  const watcher = watch(watchPaths, {
    ignored: config.exclude,
    persistent: true,
    ignoreInitial: true,
  });

  let pendingAdded: string[] = [];
  let pendingChanged: string[] = [];
  let pendingRemoved: string[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function filterByExt(paths: string[]): string[] {
    return paths.filter((p) => validExts.has(path.extname(p).toLowerCase()));
  }

  async function flush() {
    const added = filterByExt(pendingAdded);
    const changed = filterByExt(pendingChanged);
    const removed = filterByExt(pendingRemoved);

    pendingAdded = [];
    pendingChanged = [];
    pendingRemoved = [];

    if (added.length === 0 && changed.length === 0 && removed.length === 0) return;

    try {
      const scanResult = await scanFiles(config, cwd);
      const registry: IconRegistry = await generateRegistry(scanResult.files, {
        config,
        cwd,
      });

      if (added.length) onUpdate({ type: 'added', paths: added }, registry);
      if (changed.length) onUpdate({ type: 'changed', paths: changed }, registry);
      if (removed.length) onUpdate({ type: 'removed', paths: removed }, registry);
    } catch {
      // Silently skip errors during watch rebuild
    }
  }

  function scheduleFlush() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flush, config.watch.debounceMs);
  }

  watcher.on('add', (p) => {
    pendingAdded.push(p);
    scheduleFlush();
  });
  watcher.on('change', (p) => {
    pendingChanged.push(p);
    scheduleFlush();
  });
  watcher.on('unlink', (p) => {
    pendingRemoved.push(p);
    scheduleFlush();
  });

  return {
    close: () => watcher.close(),
  };
}
