import chalk from 'chalk';
import Fuse from 'fuse.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from '@icon-shelf/core';
import type { IconRegistry } from '@icon-shelf/core';

interface SearchOptions {
  category?: string;
  limit: string;
}

export async function searchCommand(query: string, options: SearchOptions) {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const registryPath = path.resolve(cwd, config.output.registry);

  let registry: IconRegistry;
  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    registry = JSON.parse(raw);
  } catch {
    console.error(chalk.red('Registry not found. Run "icon-shelf scan" first.'));
    process.exit(1);
  }

  let icons = registry.icons;
  if (options.category) {
    icons = icons.filter((i) => i.category === options.category);
    if (icons.length === 0) {
      console.log(chalk.yellow(`No icons in category: ${options.category}`));
      console.log(
        chalk.dim(
          `  Available: ${registry.categories.map((c) => c.name).join(', ')}`,
        ),
      );
      return;
    }
  }

  const fuse = new Fuse(icons, {
    keys: [
      { name: 'name', weight: 0.4 },
      { name: 'tags', weight: 0.3 },
      { name: 'category', weight: 0.2 },
      { name: 'fileName', weight: 0.1 },
    ],
    threshold: 0.4,
    includeScore: true,
  });

  const limit = parseInt(options.limit, 10) || 10;
  const results = fuse.search(query, { limit });

  if (results.length === 0) {
    console.log(chalk.yellow('No icons found matching:'), query);
    return;
  }

  console.log(chalk.bold(`Found ${results.length} icon(s):`));
  console.log();

  for (const { item, score } of results) {
    const relevance = Math.round((1 - (score ?? 0)) * 100);
    const dims =
      item.width && item.height ? `${item.width}x${item.height}` : '';

    console.log(
      `  ${chalk.cyan(item.id)}`,
      chalk.dim(`(${relevance}%)`),
      dims ? chalk.dim(`${dims}`) : '',
    );
    console.log(chalk.dim(`    ${item.path}`));
  }
}
