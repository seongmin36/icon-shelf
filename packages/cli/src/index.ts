import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { scanCommand } from './commands/scan.js';
import { searchCommand } from './commands/search.js';

const program = new Command();

program
  .name('icon-shelf')
  .description('Icon asset management toolkit — scan, search, and manage project icons')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize icon-shelf config in current directory')
  .action(initCommand);

program
  .command('scan')
  .description('Scan and generate icon registry')
  .option('-w, --watch', 'Watch for changes')
  .option('--no-cache', 'Disable cache')
  .option('-v, --verbose', 'Verbose output')
  .action(scanCommand);

program
  .command('search <query>')
  .description('Search icons by name, tag, or category')
  .option('-c, --category <category>', 'Filter by category')
  .option('-l, --limit <number>', 'Max results', '10')
  .action(searchCommand);

program.parse();
