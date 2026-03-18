import chalk from 'chalk';
import ora from 'ora';
import Fuse from 'fuse.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, scanFiles, generateRegistry } from '@icon-shelf/core';
import type { IconEntry } from '@icon-shelf/core';

interface SortOptions {
  dryRun?: boolean;
  strategy?: 'tag' | 'color' | 'name';
}

/** 아이콘 이름/태그 유사도 기반 클러스터링 */
function clusterByNameSimilarity(icons: IconEntry[]): Map<string, IconEntry[]> {
  const clusters = new Map<string, IconEntry[]>();
  const assigned = new Set<string>();

  // 1차: 공통 접두어(태그 첫 번째)로 그룹핑
  for (const icon of icons) {
    if (icon.tags.length > 0) {
      const primaryTag = icon.tags[0];
      if (!clusters.has(primaryTag)) {
        clusters.set(primaryTag, []);
      }
      clusters.get(primaryTag)!.push(icon);
      assigned.add(icon.id);
    }
  }

  // 2차: 미분류 아이콘을 Fuse.js로 가장 가까운 클러스터에 배정
  const unassigned = icons.filter((i) => !assigned.has(i.id));
  if (unassigned.length > 0 && clusters.size > 0) {
    const clusterNames = [...clusters.keys()].map((name) => ({ name }));
    const fuse = new Fuse(clusterNames, {
      keys: ['name'],
      threshold: 0.6,
    });

    for (const icon of unassigned) {
      const result = fuse.search(icon.name);
      if (result.length > 0) {
        clusters.get(result[0].item.name)!.push(icon);
      } else {
        if (!clusters.has('misc')) clusters.set('misc', []);
        clusters.get('misc')!.push(icon);
      }
    }
  }

  // 아이콘 1개뿐인 클러스터는 misc로 합침
  const finalClusters = new Map<string, IconEntry[]>();
  for (const [name, items] of clusters) {
    if (items.length <= 1) {
      if (!finalClusters.has('misc')) finalClusters.set('misc', []);
      finalClusters.get('misc')!.push(...items);
    } else {
      finalClusters.set(name, items);
    }
  }

  return finalClusters;
}

/** 색상 유사도 기반 클러스터링 */
function clusterByColor(icons: IconEntry[]): Map<string, IconEntry[]> {
  const clusters = new Map<string, IconEntry[]>();

  for (const icon of icons) {
    let group: string;
    if (icon.hasCurrentColor && icon.colors.length === 0) {
      group = 'currentColor';
    } else if (icon.colors.length === 0) {
      group = 'no-color';
    } else {
      group = icon.colors[0]; // 대표 색상
    }

    if (!clusters.has(group)) clusters.set(group, []);
    clusters.get(group)!.push(icon);
  }

  return clusters;
}

export async function sortCommand(options: SortOptions) {
  const cwd = process.cwd();
  const strategy = options.strategy ?? 'tag';
  const spinner = ora('Scanning icons for sorting...').start();

  try {
    const config = await loadConfig(cwd);
    const { files } = await scanFiles(config, cwd);

    if (files.length === 0) {
      spinner.warn('No icon files found');
      return;
    }

    const registry = await generateRegistry(files, { config, cwd });
    spinner.text = 'Analyzing icon similarity...';

    const clusters =
      strategy === 'color'
        ? clusterByColor(registry.icons)
        : clusterByNameSimilarity(registry.icons);

    spinner.succeed(`Grouped ${registry.totalCount} icons into ${clusters.size} folders`);
    console.log();

    // 정렬 기준 폴더의 루트 = 첫 번째 include 경로
    const baseDir = path.resolve(cwd, config.include[0]);
    const moves: { from: string; to: string }[] = [];

    for (const [folderName, items] of [...clusters.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const safeName = folderName.replace(/[^a-z0-9가-힣_-]/gi, '_').toLowerCase();
      console.log(`  ${chalk.cyan(safeName)}/ — ${items.length} icons`);

      for (const item of items) {
        const destDir = path.join(baseDir, safeName);
        const destPath = path.join(destDir, item.fileName);

        // 이미 같은 위치면 스킵
        if (item.absolutePath === destPath) continue;

        moves.push({ from: item.absolutePath, to: destPath });
        if (options.dryRun) {
          console.log(chalk.dim(`    ${item.fileName} → ${safeName}/`));
        }
      }
    }

    if (moves.length === 0) {
      console.log();
      console.log(chalk.green('  Already organized!'));
      return;
    }

    console.log();
    console.log(`  ${chalk.bold(moves.length)} file(s) to move`);

    if (options.dryRun) {
      console.log();
      console.log(chalk.yellow('  --dry-run: No files were moved'));
      return;
    }

    // 실제 파일 이동
    const moveSpinner = ora('Moving files...').start();
    let moved = 0;

    for (const { from, to } of moves) {
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.rename(from, to);
      moved++;
    }

    // 빈 폴더 정리
    await cleanEmptyDirs(baseDir);

    moveSpinner.succeed(`Moved ${moved} file(s)`);

    // 레지스트리 재생성
    const rescanSpinner = ora('Regenerating registry...').start();
    const { files: newFiles } = await scanFiles(config, cwd);
    await generateRegistry(newFiles, { config, cwd });
    rescanSpinner.succeed('Registry updated');
  } catch (err) {
    spinner.fail('Sort failed');
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}

async function cleanEmptyDirs(dir: string) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await cleanEmptyDirs(path.join(dir, entry.name));
      }
    }
    // 다시 확인: 이제 비어있으면 삭제
    const remaining = await fs.readdir(dir);
    if (remaining.length === 0) {
      await fs.rmdir(dir);
    }
  } catch {
    // 무시
  }
}
