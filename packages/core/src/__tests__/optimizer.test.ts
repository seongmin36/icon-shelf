import { describe, it, expect } from 'vitest';
import { optimizeSvg, checkOptimizable } from '../optimizer.js';

const UNOPTIMIZED_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" width="24" height="24">
  <!-- comment that can be removed -->
  <metadata>some metadata</metadata>
  <defs>
    <style></style>
  </defs>
  <g>
    <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2"/>
  </g>
</svg>`;

const MINIMAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>`;

describe('optimizeSvg', () => {
  it('reduces file size of unoptimized SVG', () => {
    const result = optimizeSvg(UNOPTIMIZED_SVG);

    expect(result.savedBytes).toBeGreaterThan(0);
    expect(result.savedPercent).toBeGreaterThan(0);
    expect(result.optimizedContent).toContain('<svg');
    expect(result.optimizedContent).not.toContain('<!-- comment');
    expect(result.optimizedContent).not.toContain('<metadata');
  });

  it('reports correct sizes', () => {
    const result = optimizeSvg(UNOPTIMIZED_SVG);

    expect(result.originalSize).toBe(Buffer.byteLength(UNOPTIMIZED_SVG, 'utf8'));
    expect(result.optimizedSize).toBeLessThan(result.originalSize);
    expect(result.savedBytes).toBe(result.originalSize - result.optimizedSize);
  });
});

describe('checkOptimizable', () => {
  it('returns true for unoptimized SVG', () => {
    expect(checkOptimizable(UNOPTIMIZED_SVG)).toBe(true);
  });

  it('returns false for already minimal SVG', () => {
    expect(checkOptimizable(MINIMAL_SVG)).toBe(false);
  });
});
