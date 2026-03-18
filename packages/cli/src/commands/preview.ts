import chalk from 'chalk';
import ora from 'ora';
import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { loadConfig, scanFiles, generateRegistry } from '@icon-shelf/core';
import type { IconEntry, IconRegistry } from '@icon-shelf/core';

interface PreviewOptions {
  port?: string;
  scan?: boolean;
}

function generateHtml(registry: IconRegistry): string {
  const categoryTabs = registry.categories
    .map(
      (cat) =>
        `<button class="tab" data-category="${cat.name}" onclick="filterCategory('${cat.name}')">${cat.name} <span class="badge">${cat.count}</span></button>`,
    )
    .join('\n        ');

  const iconCards = registry.icons
    .map((icon) => {
      const preview = icon.extension === '.svg' ? renderSvgPreview(icon) : renderRasterPreview(icon);
      const lintDot =
        icon.lintWarnings.some((w) => w.severity === 'error')
          ? '<span class="lint-dot error"></span>'
          : icon.lintWarnings.some((w) => w.severity === 'warning')
            ? '<span class="lint-dot warn"></span>'
            : '';
      const dims = icon.width && icon.height ? `${icon.width}x${icon.height}` : '';
      const colors = icon.colors.slice(0, 5).map((c) => `<span class="color-dot" style="background:${c}"></span>`).join('');

      return `
      <div class="card" data-category="${icon.category}" data-name="${icon.name.toLowerCase()}" data-tags="${icon.tags.join(' ')}">
        <div class="preview">${preview}</div>
        <div class="info">
          <div class="name">${icon.name} ${lintDot}</div>
          <div class="meta">${icon.fileName} ${dims ? `· ${dims}` : ''}</div>
          <div class="colors">${colors}</div>
        </div>
      </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Icon Shelf Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      padding: 24px;
    }
    header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #f0f6fc;
    }
    .count {
      background: #21262d;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 13px;
      color: #8b949e;
    }
    .search-bar {
      margin-left: auto;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 8px 12px;
      color: #c9d1d9;
      font-size: 14px;
      width: 260px;
      outline: none;
    }
    .search-bar:focus { border-color: #58a6ff; }
    .tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .tab {
      background: #21262d;
      border: 1px solid #30363d;
      color: #8b949e;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s;
    }
    .tab:hover, .tab.active { background: #30363d; color: #f0f6fc; border-color: #58a6ff; }
    .badge {
      background: #30363d;
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 11px;
      margin-left: 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }
    .card {
      background: #161b22;
      border: 1px solid #21262d;
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.15s;
      cursor: pointer;
    }
    .card:hover { border-color: #58a6ff; transform: translateY(-2px); }
    .card.hidden { display: none; }
    .preview {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100px;
      padding: 16px;
      background: #0d1117;
      border-bottom: 1px solid #21262d;
    }
    .preview svg, .preview img {
      max-width: 56px;
      max-height: 56px;
      filter: brightness(0.9);
    }
    .preview svg * { fill: currentColor; }
    .info { padding: 10px; }
    .name {
      font-size: 12px;
      font-weight: 600;
      color: #f0f6fc;
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      font-size: 11px;
      color: #484f58;
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .colors {
      display: flex;
      gap: 3px;
      margin-top: 6px;
    }
    .color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid #30363d;
    }
    .lint-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .lint-dot.error { background: #f85149; }
    .lint-dot.warn { background: #d29922; }

    /* Modal */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      z-index: 100;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.open { display: flex; }
    .modal {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 24px;
      max-width: 480px;
      width: 90%;
    }
    .modal .preview-large {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 160px;
      background: #0d1117;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .modal .preview-large svg, .modal .preview-large img {
      max-width: 120px;
      max-height: 120px;
    }
    .modal h2 { font-size: 16px; margin-bottom: 8px; color: #f0f6fc; }
    .modal .detail { font-size: 13px; color: #8b949e; margin: 4px 0; }
    .modal .lint-list { margin-top: 12px; }
    .modal .lint-item {
      font-size: 12px;
      padding: 4px 8px;
      margin: 2px 0;
      border-radius: 4px;
    }
    .lint-item.error { background: rgba(248,81,73,0.1); color: #f85149; }
    .lint-item.warning { background: rgba(210,153,34,0.1); color: #d29922; }
    .modal .close-btn {
      position: absolute;
      top: 12px;
      right: 16px;
      background: none;
      border: none;
      color: #8b949e;
      font-size: 20px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <header>
    <h1>Icon Shelf</h1>
    <span class="count">${registry.totalCount} icons</span>
    <input class="search-bar" type="text" placeholder="Search icons..." oninput="filterSearch(this.value)">
  </header>

  <div class="tabs">
    <button class="tab active" onclick="filterCategory('all')">All</button>
    ${categoryTabs}
  </div>

  <div class="grid" id="grid">
    ${iconCards}
  </div>

  <div class="modal-overlay" id="modal" onclick="closeModal(event)">
    <div class="modal" id="modalContent"></div>
  </div>

  <script>
    const icons = ${JSON.stringify(
      registry.icons.map((i) => ({
        id: i.id,
        name: i.name,
        fileName: i.fileName,
        category: i.category,
        tags: i.tags,
        path: i.path,
        width: i.width,
        height: i.height,
        extension: i.extension,
        sizeBytes: i.sizeBytes,
        colors: i.colors,
        hasCurrentColor: i.hasCurrentColor,
        isAnimated: i.isAnimated,
        lintWarnings: i.lintWarnings,
      })),
    )};

    let activeCategory = 'all';

    function filterCategory(cat) {
      activeCategory = cat;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      applyFilters();
    }

    function filterSearch(query) {
      const q = query.toLowerCase();
      document.querySelectorAll('.card').forEach(card => {
        const name = card.dataset.name || '';
        const tags = card.dataset.tags || '';
        const cat = card.dataset.category || '';
        const matchSearch = !q || name.includes(q) || tags.includes(q) || cat.includes(q);
        const matchCat = activeCategory === 'all' || cat === activeCategory;
        card.classList.toggle('hidden', !(matchSearch && matchCat));
      });
    }

    function applyFilters() {
      const q = document.querySelector('.search-bar').value.toLowerCase();
      document.querySelectorAll('.card').forEach(card => {
        const name = card.dataset.name || '';
        const tags = card.dataset.tags || '';
        const cat = card.dataset.category || '';
        const matchSearch = !q || name.includes(q) || tags.includes(q) || cat.includes(q);
        const matchCat = activeCategory === 'all' || cat === activeCategory;
        card.classList.toggle('hidden', !(matchSearch && matchCat));
      });
    }

    document.querySelectorAll('.card').forEach((card, i) => {
      card.addEventListener('click', () => {
        const icon = icons[i];
        const preview = card.querySelector('.preview').innerHTML;
        const dims = icon.width && icon.height ? icon.width + 'x' + icon.height : 'N/A';
        const size = icon.sizeBytes < 1024 ? icon.sizeBytes + ' B' : (icon.sizeBytes / 1024).toFixed(1) + ' KB';
        const lints = icon.lintWarnings
          .filter(w => w.severity !== 'info')
          .map(w => '<div class="lint-item ' + w.severity + '">' + w.rule + ': ' + w.message + '</div>')
          .join('');

        document.getElementById('modalContent').innerHTML =
          '<div class="preview-large">' + preview + '</div>' +
          '<h2>' + icon.name + '</h2>' +
          '<div class="detail">File: ' + icon.fileName + '</div>' +
          '<div class="detail">Path: ' + icon.path + '</div>' +
          '<div class="detail">Category: ' + icon.category + '</div>' +
          '<div class="detail">Dimensions: ' + dims + ' · Size: ' + size + '</div>' +
          '<div class="detail">Tags: ' + icon.tags.join(', ') + '</div>' +
          (lints ? '<div class="lint-list">' + lints + '</div>' : '');

        document.getElementById('modal').classList.add('open');
      });
    });

    function closeModal(e) {
      if (e.target.id === 'modal') {
        document.getElementById('modal').classList.remove('open');
      }
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') document.getElementById('modal').classList.remove('open');
    });
  </script>
</body>
</html>`;
}

function renderSvgPreview(icon: IconEntry): string {
  // preview 필드에 SVG 전체가 들어있음 — 인라인으로 삽입
  return icon.preview;
}

function renderRasterPreview(icon: IconEntry): string {
  // preview 필드에 base64 data URI가 들어있음
  return `<img src="${icon.preview}" alt="${icon.name}">`;
}

export async function previewCommand(options: PreviewOptions) {
  const cwd = process.cwd();
  const spinner = ora('Preparing preview...').start();

  try {
    const config = await loadConfig(cwd);

    // --scan 옵션: 미리 스캔
    if (options.scan) {
      spinner.text = 'Scanning files...';
      const { files } = await scanFiles(config, cwd);
      await generateRegistry(files, { config, cwd });
    }

    // 레지스트리 로드
    const registryPath = path.resolve(cwd, config.output.registry);
    let registry: IconRegistry;
    try {
      const raw = await fs.readFile(registryPath, 'utf8');
      registry = JSON.parse(raw);
    } catch {
      spinner.fail('Registry not found. Run "icon-shelf scan" first.');
      process.exit(1);
    }

    if (registry.icons.length === 0) {
      spinner.warn('No icons in registry');
      return;
    }

    // HTML 생성
    const html = generateHtml(registry);
    const outDir = path.resolve(cwd, '.icon-shelf');
    await fs.mkdir(outDir, { recursive: true });
    const htmlPath = path.join(outDir, 'preview.html');
    await fs.writeFile(htmlPath, html);

    spinner.succeed(
      `Preview generated: ${registry.totalCount} icons`,
    );

    // 브라우저로 열기
    const openCmd =
      process.platform === 'darwin'
        ? 'open'
        : process.platform === 'win32'
          ? 'start'
          : 'xdg-open';

    exec(`${openCmd} "${htmlPath}"`);
    console.log(chalk.dim(`  ${htmlPath}`));
  } catch (err) {
    spinner.fail('Preview failed');
    console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    process.exit(1);
  }
}
