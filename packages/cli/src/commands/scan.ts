import chalk from 'chalk';
import ora from 'ora';
import { loadConfig, scanFiles, generateRegistry, createWatcher } from '@icon-shelf/core';
import type { IconRegistry } from '@icon-shelf/core';

interface ScanOptions {
  watch?: boolean;
  cache?: boolean;
  verbose?: boolean;
  search?: string;
}

export async function scanCommand(options: ScanOptions): Promise<IconRegistry | null> {
  const cwd = process.cwd();
  const spinner = ora('Loading config...').start();

  try {
    const config = await loadConfig(cwd);
    if (options.cache === false) {
      config.cache.enabled = false;
    }

    spinner.text = 'Scanning files...';
    const { files, scanDurationMs } = await scanFiles(config, cwd);

    if (files.length === 0) {
      spinner.warn('No icon files found');
      console.log(chalk.dim(`  Searched: ${config.include.join(', ')}`));
      console.log(chalk.dim(`  Extensions: ${config.extensions.join(', ')}`));
      return null;
    }

    spinner.text = `Parsing ${files.length} icons...`;
    const registry = await generateRegistry(files, { config, cwd });

    spinner.succeed(
      `Found ${chalk.bold(registry.totalCount)} icons in ${registry.categories.length} categories`,
    );

    // Category summary
    console.log();
    for (const cat of registry.categories) {
      console.log(`  ${chalk.cyan(cat.name)} — ${cat.count} icons`);
    }

    // Lint summary
    const allWarnings = registry.icons.flatMap((i) => i.lintWarnings);
    const errors = allWarnings.filter((w) => w.severity === 'error');
    const warnings = allWarnings.filter((w) => w.severity === 'warning');

    if (errors.length > 0 || warnings.length > 0) {
      console.log();
      if (errors.length > 0) {
        console.log(chalk.red(`  ${errors.length} error(s)`));
      }
      if (warnings.length > 0) {
        console.log(chalk.yellow(`  ${warnings.length} warning(s)`));
      }

      if (options.verbose) {
        for (const icon of registry.icons) {
          for (const w of icon.lintWarnings) {
            if (w.severity === 'info') continue;
            const color = w.severity === 'error' ? chalk.red : chalk.yellow;
            console.log(color(`  ${icon.path}: ${w.rule} — ${w.message}`));
          }
        }
      }
    }

    console.log();
    console.log(chalk.dim(`  Registry: ${config.output.registry}`));
    console.log(chalk.dim(`  Scan: ${scanDurationMs.toFixed(0)}ms`));

    // --search: scan 후 바로 검색
    if (options.search) {
      console.log();
      const { runSearch } = await import('./search.js');
      await runSearch(registry, options.search, {});
    }

    // Watch mode
    if (options.watch) {
      console.log();
      console.log(chalk.blue('  Watching for changes... (Ctrl+C to stop)'));

      await createWatcher({
        config,
        cwd,
        onUpdate: (event, newRegistry) => {
          const time = new Date().toLocaleTimeString();
          console.log(
            chalk.dim(`  [${time}]`),
            chalk.green(`${event.type}: ${event.paths.length} file(s)`),
            chalk.dim(`→ ${newRegistry.totalCount} icons`),
          );
        },
      });
    }

    return registry;
  } catch (err) {
    spinner.fail('Scan failed');
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
