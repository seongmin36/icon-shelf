import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { scanCommand } from './commands/scan.js';
import { searchCommand } from './commands/search.js';
import { sortCommand } from './commands/sort.js';
import { previewCommand } from './commands/preview.js';

const program = new Command();

program
  .name('icon-shelf')
  .description('Icon asset management toolkit — scan, search, sort, and preview project icons')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize icon-shelf config in current directory')
  .option('-s, --scan', 'Run scan immediately after init')
  .action(initCommand);

program
  .command('scan')
  .description('Scan and generate icon registry')
  .option('-w, --watch', 'Watch for changes')
  .option('--no-cache', 'Disable cache')
  .option('-v, --verbose', 'Verbose output')
  .option('-s, --search <query>', 'Search icons after scan')
  .action(scanCommand);

program
  .command('search <query>')
  .description('Search icons by name, tag, or category')
  .option('-c, --category <category>', 'Filter by category')
  .option('-l, --limit <number>', 'Max results', '10')
  .action(searchCommand);

program
  .command('sort')
  .description('Group similar icons into folders automatically')
  .option('-d, --dry-run', 'Preview changes without moving files')
  .option('--strategy <strategy>', 'Grouping strategy: tag | color | name', 'tag')
  .action(sortCommand);

program
  .command('preview')
  .description('Open visual grid preview of all icons in browser')
  .option('-s, --scan', 'Scan before generating preview')
  .action(previewCommand);

program.parse();
