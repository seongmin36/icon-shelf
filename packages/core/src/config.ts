import path from 'node:path';
import type { IconShelfConfig, UserConfig } from './types.js';

const CONFIG_FILES = [
  '.icon-shelf.config.ts',
  '.icon-shelf.config.js',
  '.icon-shelf.config.json',
  'icon-shelf.config.ts',
  'icon-shelf.config.js',
  'icon-shelf.config.json',
];

const DEFAULT_CONFIG: IconShelfConfig = {
  include: ['src/assets/icons'],
  exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  extensions: ['.svg', '.png', '.jpg', '.webp'],
  categoryStrategy: 'directory',
  output: {
    registry: 'src/__generated__/icon-registry.json',
  },
  cache: {
    enabled: true,
    path: '.icon-shelf.cache',
  },
  watch: {
    debounceMs: 200,
    stabilityThreshold: 300,
  },
  optimize: {
    enabled: false,
    originalFilePolicy: 'preserve',
  },
};

export function defineConfig(userConfig: UserConfig): UserConfig {
  return userConfig;
}

function mergeConfig(defaults: IconShelfConfig, user: UserConfig): IconShelfConfig {
  return {
    include: user.include ?? defaults.include,
    exclude: user.exclude ?? defaults.exclude,
    extensions: user.extensions ?? defaults.extensions,
    categoryStrategy: user.categoryStrategy ?? defaults.categoryStrategy,
    output: { ...defaults.output, ...user.output },
    cache: { ...defaults.cache, ...user.cache },
    watch: { ...defaults.watch, ...user.watch },
    optimize: { ...defaults.optimize, ...user.optimize },
  };
}

export async function loadConfig(cwd?: string): Promise<IconShelfConfig> {
  const resolvedCwd = cwd ?? process.cwd();

  // Try to find and load config file
  const { default: JoyCon } = await import('joycon');
  const joycon = new JoyCon();

  const result = await joycon.resolve({
    files: CONFIG_FILES,
    cwd: resolvedCwd,
    stopDir: path.parse(resolvedCwd).root,
  });

  if (!result) {
    return { ...DEFAULT_CONFIG };
  }

  const configPath = result;
  const ext = path.extname(configPath);

  let userConfig: UserConfig;

  if (ext === '.json') {
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(configPath, 'utf8');
    userConfig = JSON.parse(raw) as UserConfig;
  } else {
    // .ts or .js — use bundle-require to transpile + load
    const { bundleRequire } = await import('bundle-require');
    const { mod } = await bundleRequire({ filepath: configPath });
    userConfig = (mod.default ?? mod) as UserConfig;
  }

  return mergeConfig(DEFAULT_CONFIG, userConfig);
}

export { DEFAULT_CONFIG };
