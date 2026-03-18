import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';

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

export async function initCommand() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.icon-shelf.config.json');

  try {
    await fs.access(configPath);
    console.log(chalk.yellow('⚠ Config file already exists: .icon-shelf.config.json'));
    return;
  } catch {
    // Does not exist — create it
  }

  await fs.writeFile(configPath, CONFIG_TEMPLATE);
  console.log(chalk.green('✓ Created .icon-shelf.config.json'));
  console.log(chalk.dim('  Edit the config, then run: icon-shelf scan'));
}
