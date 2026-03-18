import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { parseIconFile, fileNameToDisplayName, fileNameToTags } from '../parser.js';

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const ICONS_DIR = path.join(FIXTURES_DIR, 'icons');

describe('parseIconFile', () => {
  it('extracts viewBox from SVG', async () => {
    const filePath = path.join(ICONS_DIR, 'navigation', 'arrow-left.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    expect(result.viewBox).toBe('0 0 24 24');
    expect(result.width).toBe(24);
    expect(result.height).toBe(24);
  });

  it('detects currentColor usage', async () => {
    const filePath = path.join(ICONS_DIR, 'navigation', 'arrow-left.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    expect(result.hasCurrentColor).toBe(true);
  });

  it('detects no currentColor when absent', async () => {
    const filePath = path.join(ICONS_DIR, 'actions', 'close.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    expect(result.hasCurrentColor).toBe(false);
  });

  it('extracts colors', async () => {
    const filePath = path.join(ICONS_DIR, 'actions', 'close.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    expect(result.colors).toContain('#333333');
    expect(result.colorCount).toBeGreaterThan(0);
  });

  it('detects animation elements', async () => {
    const filePath = path.join(ICONS_DIR, 'bad-icons', 'animated.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    expect(result.isAnimated).toBe(true);
  });

  it('detects no animation in static SVG', async () => {
    const filePath = path.join(ICONS_DIR, 'navigation', 'arrow-left.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    expect(result.isAnimated).toBe(false);
  });

  // Lint rules
  it('warns on missing viewBox', async () => {
    const filePath = path.join(ICONS_DIR, 'bad-icons', 'no-viewbox.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    const rules = result.lintWarnings.map((w) => w.rule);
    expect(rules).toContain('has-viewbox');
  });

  it('warns on fixed dimensions', async () => {
    const filePath = path.join(ICONS_DIR, 'bad-icons', 'no-viewbox.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    const rules = result.lintWarnings.map((w) => w.rule);
    expect(rules).toContain('no-fixed-dimensions');
  });

  it('warns on inline styles', async () => {
    const filePath = path.join(ICONS_DIR, 'bad-icons', 'inline-styles.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    const rules = result.lintWarnings.map((w) => w.rule);
    expect(rules).toContain('no-inline-style');
  });

  it('suggests currentColor when not used', async () => {
    const filePath = path.join(ICONS_DIR, 'actions', 'close.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    const rules = result.lintWarnings.map((w) => w.rule);
    expect(rules).toContain('uses-current-color');
  });

  it('does not suggest currentColor when already used', async () => {
    const filePath = path.join(ICONS_DIR, 'navigation', 'arrow-left.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    const rules = result.lintWarnings.map((w) => w.rule);
    expect(rules).not.toContain('uses-current-color');
  });

  it('warns on missing title', async () => {
    const filePath = path.join(ICONS_DIR, 'navigation', 'menu.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    const rules = result.lintWarnings.map((w) => w.rule);
    expect(rules).toContain('has-title');
  });

  it('does not warn about title when present', async () => {
    const filePath = path.join(ICONS_DIR, 'navigation', 'arrow-left.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    const rules = result.lintWarnings.map((w) => w.rule);
    expect(rules).not.toContain('has-title');
  });

  it('includes SVG content as preview', async () => {
    const filePath = path.join(ICONS_DIR, 'navigation', 'arrow-left.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    expect(result.preview).toContain('<svg');
    expect(result.preview).toContain('</svg>');
  });

  it('extracts file metadata', async () => {
    const filePath = path.join(ICONS_DIR, 'navigation', 'arrow-left.svg');
    const result = await parseIconFile(filePath, FIXTURES_DIR);

    expect(result.fileName).toBe('arrow-left.svg');
    expect(result.extension).toBe('.svg');
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.name).toBe('Arrow Left');
  });
});

describe('fileNameToDisplayName', () => {
  it('converts kebab-case', () => {
    expect(fileNameToDisplayName('arrow-left')).toBe('Arrow Left');
  });

  it('converts snake_case', () => {
    expect(fileNameToDisplayName('arrow_left')).toBe('Arrow Left');
  });

  it('converts camelCase', () => {
    expect(fileNameToDisplayName('arrowLeft')).toBe('Arrow Left');
  });
});

describe('fileNameToTags', () => {
  it('splits kebab-case into tags', () => {
    expect(fileNameToTags('arrow-left-circle')).toEqual([
      'arrow',
      'left',
      'circle',
    ]);
  });

  it('filters short tags', () => {
    expect(fileNameToTags('a-bc-d')).toEqual(['bc']);
  });
});
