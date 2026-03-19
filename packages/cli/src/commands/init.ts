import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scanCommand } from './scan.js';

// ─── 아이콘 폴더 후보 자동 감지 ────────────────────────────

const CANDIDATE_DIRS = [
  'src/assets/icons',
  'src/icons',
  'src/assets',
  'public/icons',
  'public/assets/icons',
  'shared/assets/icons',
  'assets/icons',
  'resources/icons',
  'static/icons',
];

async function detectIconDirs(cwd: string): Promise<string[]> {
  const found: string[] = [];
  for (const dir of CANDIDATE_DIRS) {
    try {
      const stat = await fs.stat(path.join(cwd, dir));
      if (stat.isDirectory()) found.push(dir);
    } catch {
      // 없으면 스킵
    }
  }
  return found;
}

async function countIconsInDir(
  cwd: string,
  dir: string,
  exts: string[],
): Promise<number> {
  let count = 0;
  async function walk(dirPath: string) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (exts.some((ext) => entry.name.toLowerCase().endsWith(ext))) {
          count++;
        }
      }
    } catch {
      // 권한 없으면 스킵
    }
  }
  await walk(path.join(cwd, dir));
  return count;
}

// ─── 기본 템플릿 (인터랙티브 실패 시 폴백) ───────────────────

const DEFAULT_CONFIG = {
  include: ['src/assets/icons'],
  exclude: ['**/node_modules/**'],
  extensions: ['.svg', '.png', '.jpg', '.webp'],
  categoryStrategy: 'directory' as const,
  output: {
    registry: 'src/__generated__/icon-registry.json',
  },
};

// ─── Init Command ───────────────────────────────────────────

interface InitOptions {
  scan?: boolean;
  yes?: boolean;
}

export async function initCommand(options: InitOptions) {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.icon-shelf.config.json');

  // 이미 존재하면 경고
  let alreadyExists = false;
  try {
    await fs.access(configPath);
    alreadyExists = true;
    console.log(chalk.yellow('⚠ Config file already exists: .icon-shelf.config.json'));
  } catch {
    // 없음 — 생성 진행
  }

  if (alreadyExists) {
    if (options.scan) {
      console.log();
      await scanCommand({ cache: true });
    }
    return;
  }

  // --yes 플래그면 기본값으로 바로 생성
  if (options.yes) {
    await fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n');
    console.log(chalk.green('✓ Created .icon-shelf.config.json'));
    if (options.scan) {
      console.log();
      await scanCommand({ cache: true });
    }
    return;
  }

  // ─── 인터랙티브 모드 ──────────────────────────────────────

  let config = { ...DEFAULT_CONFIG };

  try {
    const { checkbox, select, input } = await import('@inquirer/prompts');

    // 1. 아이콘 폴더 감지 및 선택
    const detected = await detectIconDirs(cwd);
    const exts = ['.svg', '.png', '.jpg', '.webp'];

    // 감지된 폴더 + 수동 입력 옵션
    const dirChoices: { name: string; value: string; checked?: boolean }[] = [];

    for (const dir of detected) {
      const count = await countIconsInDir(cwd, dir, exts);
      dirChoices.push({
        name: `${dir} ${chalk.dim(`(${count} files)`)}`,
        value: dir,
        checked: true,
      });
    }

    // 감지 안 된 후보도 보여줌 (체크 해제 상태)
    for (const dir of CANDIDATE_DIRS) {
      if (!detected.includes(dir)) {
        dirChoices.push({
          name: chalk.dim(dir + ' (not found)'),
          value: dir,
          checked: false,
        });
      }
    }

    console.log();
    let selectedDirs: string[];

    if (dirChoices.length > 0) {
      selectedDirs = await checkbox({
        message: '아이콘 폴더를 선택하세요 (스페이스바로 복수 선택)',
        choices: dirChoices,
      });
    } else {
      selectedDirs = [];
    }

    // 선택된 게 없으면 직접 입력
    if (selectedDirs.length === 0) {
      const custom = await input({
        message: '아이콘 폴더 경로를 입력하세요 (쉼표로 구분)',
        default: 'src/assets/icons',
      });
      selectedDirs = custom.split(',').map((s) => s.trim()).filter(Boolean);
    }

    config.include = selectedDirs;

    // 2. 제외 패턴
    const excludeInput = await input({
      message: '제외할 패턴 (쉼표로 구분)',
      default: '**/node_modules/**',
    });
    config.exclude = excludeInput.split(',').map((s) => s.trim()).filter(Boolean);

    // 3. 카테고리 전략
    const strategy = await select({
      message: '카테고리 분류 방식',
      choices: [
        {
          name: 'directory — 폴더명 기준 (navigation/, actions/ 등)',
          value: 'directory' as const,
        },
        {
          name: 'prefix — 파일명 접두어 기준 (nav-arrow → nav)',
          value: 'prefix' as const,
        },
        {
          name: 'none — 분류 안 함',
          value: 'none' as const,
        },
      ],
    });
    config.categoryStrategy = strategy;

    // 4. 출력 경로
    const registryPath = await input({
      message: '레지스트리 출력 경로',
      default: 'src/__generated__/icon-registry.json',
    });
    config.output.registry = registryPath;
  } catch (err) {
    // Ctrl+C 또는 inquirer 로드 실패 시 기본값으로 폴백
    if ((err as Error).name === 'ExitPromptError') {
      console.log(chalk.dim('\n  취소됨'));
      return;
    }
    console.log(chalk.dim('  인터랙티브 모드 사용 불가. 기본값으로 생성합니다.'));
  }

  // 설정 파일 저장
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log();
  console.log(chalk.green('✓ Created .icon-shelf.config.json'));

  // 선택된 폴더 요약
  console.log(chalk.dim(`  include: ${config.include.join(', ')}`));
  console.log(chalk.dim(`  category: ${config.categoryStrategy}`));
  console.log(chalk.dim(`  output: ${config.output.registry}`));

  if (options.scan) {
    console.log();
    await scanCommand({ cache: true });
  } else {
    console.log(chalk.dim('\n  Run: icon-shelf scan'));
  }
}
