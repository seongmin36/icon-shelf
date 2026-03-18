import { optimize as svgoOptimize } from 'svgo';
import type { OptimizeResult } from './types.js';

export function optimizeSvg(svgContent: string): OptimizeResult {
  const originalSize = Buffer.byteLength(svgContent, 'utf8');

  const result = svgoOptimize(svgContent, {
    multipass: true,
    plugins: ['preset-default'],
  });

  const optimizedSize = Buffer.byteLength(result.data, 'utf8');

  return {
    originalSize,
    optimizedSize,
    savedBytes: originalSize - optimizedSize,
    savedPercent: originalSize > 0 ? ((originalSize - optimizedSize) / originalSize) * 100 : 0,
    optimizedContent: result.data,
  };
}

export function checkOptimizable(svgContent: string): boolean {
  const result = optimizeSvg(svgContent);
  return result.savedPercent > 5;
}
