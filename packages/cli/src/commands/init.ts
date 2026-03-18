import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scanCommand } from './scan.js';

const CONFIG_TEMPLATE = `{
  "include": ["src/assets/icons"],
  "exclude": ["**/node_modules/**"],
  "extensions": [".svg", ".png", ".jpg", ".webp"],
  "categoryStrategy": "directory",
  "output": {
    "registry": "src/__generated__/icon-registry.json"
  }
}
`;

interface InitOptions {
  scan?: boolean;
}

export async function initCommand(options: InitOptions) {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.icon-shelf.config.json');

  let alreadyExists = false;
  try {
    await fs.access(configPath);
    alreadyExists = true;
    console.log(chalk.yellow('⚠ Config file already exists: .icon-shelf.config.json'));
  } catch {
    // Does not exist — create it
  }

  if (!alreadyExists) {
    await fs.writeFile(configPath, CONFIG_TEMPLATE);
    console.log(chalk.green('✓ Created .icon-shelf.config.json'));
  }

  if (options.scan) {
    console.log();
    await scanCommand({ cache: true });
  } else if (!alreadyExists) {
    console.log(chalk.dim('  Edit the config, then run: icon-shelf scan'));
  }
}
