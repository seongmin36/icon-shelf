import { parse as parseSvgString } from 'svg-parser';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Stats } from 'node:fs';
import type { IconEntry, LintWarning } from './types.js';

type ParsedIconPartial = Omit<IconEntry, 'id' | 'category' | 'tags' | 'contentHash'>;

// ─── SVG AST Helpers ────────────────────────────────────────

interface SvgNode {
  type: string;
  tagName?: string;
  properties?: Record<string, string | number>;
  children?: SvgNode[];
}

function walkNodes(node: SvgNode, visitor: (n: SvgNode) => void): void {
  visitor(node);
  if (node.children) {
    for (const child of node.children) {
      if (typeof child === 'object') {
        walkNodes(child, visitor);
      }
    }
  }
}

const COLOR_PROPS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color'];
const IGNORE_COLORS = new Set(['none', 'transparent', 'inherit', 'unset', '']);

function normalizeColor(value: string): string | null {
  const v = String(value).trim().toLowerCase();
  if (IGNORE_COLORS.has(v)) return null;
  return v;
}

const ANIMATION_TAGS = new Set(['animate', 'animatetransform', 'animatemotion', 'set']);

function parseViewBox(vb: string): { width: number; height: number } | null {
  const parts = vb.split(/[\s,]+/).map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
    return { width: parts[2], height: parts[3] };
  }
  return null;
}

function parseDimension(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(n) ? null : n;
}

// ─── SVG Preview 경량화 ──────────────────────────────────────

const MAX_PREVIEW_LENGTH = 2048;

function truncateSvgPreview(content: string): string {
  if (content.length <= MAX_PREVIEW_LENGTH) return content;
  // SVG 태그 구조를 유지하면서 잘라냄
  const closingTag = '</svg>';
  const truncated = content.slice(0, MAX_PREVIEW_LENGTH - closingTag.length);
  // 마지막 열린 태그를 닫지 않은 채로 자르면 깨지므로 </svg>를 붙임
  return truncated + closingTag;
}

// ─── SVG Parser ─────────────────────────────────────────────

async function parseSvgFile(filePath: string): Promise<{
  width: number | null;
  height: number | null;
  viewBox: string | null;
  hasCurrentColor: boolean;
  colorCount: number;
  colors: string[];
  isAnimated: boolean;
  lintWarnings: LintWarning[];
  preview: string;
}> {
  const content = await fs.readFile(filePath, 'utf8');
  const ast = parseSvgString(content);

  const root = ast.children?.[0] as SvgNode | undefined;
  if (!root || root.tagName !== 'svg') {
    return {
      width: null,
      height: null,
      viewBox: null,
      hasCurrentColor: false,
      colorCount: 0,
      colors: [],
      isAnimated: false,
      lintWarnings: [],
      preview: truncateSvgPreview(content),
    };
  }

  const props = root.properties ?? {};

  // Dimensions
  const viewBoxStr = props.viewBox ? String(props.viewBox) : null;
  let width = parseDimension(props.width);
  let height = parseDimension(props.height);

  if (viewBoxStr && (width === null || height === null)) {
    const vb = parseViewBox(viewBoxStr);
    if (vb) {
      width ??= vb.width;
      height ??= vb.height;
    }
  }

  // Walk AST for colors, animation, styles — 한 번의 순회로 모든 정보 수집
  const colors = new Set<string>();
  let hasCurrentColor = false;
  let isAnimated = false;
  let hasInlineStyle = false;
  let hasRasterImage = false;
  let hasTitle = false;
  let hasFixedDimensions = false;

  // Check root for fixed dimensions
  if (props.width !== undefined && props.height !== undefined) {
    const wStr = String(props.width);
    const hStr = String(props.height);
    if (!wStr.endsWith('%') && !hStr.endsWith('%')) {
      hasFixedDimensions = true;
    }
  }

  walkNodes(root, (node) => {
    if (!node.tagName) return;

    const tagLower = node.tagName.toLowerCase();

    // Animation detection
    if (ANIMATION_TAGS.has(tagLower)) {
      isAnimated = true;
    }

    // Title detection
    if (tagLower === 'title') {
      hasTitle = true;
    }

    // Raster image detection
    if (tagLower === 'image') {
      const href = node.properties?.href ?? node.properties?.['xlink:href'];
      if (href && !String(href).endsWith('.svg')) {
        hasRasterImage = true;
      }
    }

    // Inline style detection
    if (node.properties?.style) {
      hasInlineStyle = true;
      const styleStr = String(node.properties.style);
      if (styleStr.includes('animation') || styleStr.includes('@keyframes')) {
        isAnimated = true;
      }
    }

    // Color extraction
    if (node.properties) {
      for (const prop of COLOR_PROPS) {
        const val = node.properties[prop];
        if (val !== undefined) {
          const strVal = String(val);
          if (strVal === 'currentColor' || strVal === 'currentcolor') {
            hasCurrentColor = true;
          }
          const normalized = normalizeColor(strVal);
          if (normalized && normalized !== 'currentcolor') {
            colors.add(normalized);
          }
        }
      }
    }
  });

  // Build lint warnings
  const lintWarnings: LintWarning[] = [];

  if (!viewBoxStr) {
    lintWarnings.push({
      rule: 'has-viewbox',
      severity: 'error',
      message: 'viewBox 속성이 없습니다. 반응형 렌더링을 위해 필수입니다.',
    });
  }

  if (hasFixedDimensions) {
    lintWarnings.push({
      rule: 'no-fixed-dimensions',
      severity: 'warning',
      message: 'SVG에 고정 width/height가 설정되어 있습니다. viewBox만 사용을 권장합니다.',
    });
  }

  if (hasInlineStyle) {
    lintWarnings.push({
      rule: 'no-inline-style',
      severity: 'warning',
      message: 'style 속성 대신 SVG 속성(fill, stroke)을 직접 사용하세요.',
    });
  }

  if (!hasCurrentColor) {
    lintWarnings.push({
      rule: 'uses-current-color',
      severity: 'info',
      message: 'currentColor를 사용하면 CSS 색상 상속이 가능합니다.',
    });
  }

  if (hasRasterImage) {
    lintWarnings.push({
      rule: 'no-raster-image',
      severity: 'error',
      message: 'SVG 내부에 래스터 이미지(<image>)가 포함되어 있습니다.',
    });
  }

  if (!hasTitle) {
    lintWarnings.push({
      rule: 'has-title',
      severity: 'warning',
      message: '접근성을 위해 <title> 요소 추가를 권장합니다.',
    });
  }

  const colorsArr = [...colors];

  return {
    width,
    height,
    viewBox: viewBoxStr,
    hasCurrentColor,
    colorCount: colorsArr.length,
    colors: colorsArr,
    isAnimated,
    lintWarnings,
    preview: truncateSvgPreview(content),
  };
}

// ─── Raster Image Parser (sharp 파이프라인 통합) ─────────────

async function parseRasterFile(filePath: string): Promise<{
  width: number | null;
  height: number | null;
  preview: string;
}> {
  // sharp 인스턴스 1번만 생성하여 메타데이터 + 썸네일 동시 처리
  const instance = sharp(filePath);
  const [metadata, thumbnail] = await Promise.all([
    instance.metadata(),
    instance
      .clone()
      .resize(64, 64, { fit: 'inside' })
      .png()
      .toBuffer(),
  ]);

  const width = metadata.width ?? null;
  const height = metadata.height ?? null;
  const preview = `data:image/png;base64,${thumbnail.toString('base64')}`;

  return { width, height, preview };
}

// ─── Display Name Helper ────────────────────────────────────

export function fileNameToDisplayName(name: string): string {
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function fileNameToTags(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .split(/[-_]+/)
    .filter((t) => t.length > 1);
}

// ─── Unified Parse Function ─────────────────────────────────

export async function parseIconFile(
  filePath: string,
  cwd: string,
  existingStat?: Stats,
): Promise<ParsedIconPartial> {
  // stat을 외부에서 받으면 재사용, 없으면 직접 호출
  const stat = existingStat ?? await fs.stat(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);

  const base = {
    name: fileNameToDisplayName(baseName),
    fileName: path.basename(filePath),
    path: path.relative(cwd, filePath),
    absolutePath: filePath,
    extension: ext,
    sizeBytes: stat.size,
    lastModified: stat.mtimeMs,
  };

  if (ext === '.svg') {
    const svgMeta = await parseSvgFile(filePath);
    return { ...base, ...svgMeta };
  }

  const rasterMeta = await parseRasterFile(filePath);
  return {
    ...base,
    ...rasterMeta,
    viewBox: null,
    hasCurrentColor: false,
    colorCount: 0,
    colors: [],
    isAnimated: false,
    lintWarnings: [],
  };
}
