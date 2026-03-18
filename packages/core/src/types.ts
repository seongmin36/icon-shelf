// ─── Config Types ───────────────────────────────────────────

export type CategoryStrategy = 'directory' | 'prefix' | 'none';

export interface OutputConfig {
  registry: string;
  typesFile?: string;
  components?: string;
}

export interface CacheConfig {
  enabled: boolean;
  path: string;
}

export interface WatchConfig {
  debounceMs: number;
  stabilityThreshold: number;
}

export interface OptimizeConfig {
  enabled: boolean;
  originalFilePolicy: 'preserve' | 'overwrite' | 'backup';
}

export interface IconShelfConfig {
  include: string[];
  exclude: string[];
  extensions: string[];
  categoryStrategy: CategoryStrategy;
  output: OutputConfig;
  cache: CacheConfig;
  watch: WatchConfig;
  optimize: OptimizeConfig;
}

export type UserConfig = Partial<
  Omit<IconShelfConfig, 'output' | 'cache' | 'watch' | 'optimize'> & {
    output: Partial<OutputConfig>;
    cache: Partial<CacheConfig>;
    watch: Partial<WatchConfig>;
    optimize: Partial<OptimizeConfig>;
  }
>;

// ─── Icon Metadata Types ────────────────────────────────────

export type LintRule =
  | 'no-fixed-dimensions'
  | 'has-viewbox'
  | 'no-inline-style'
  | 'uses-current-color'
  | 'no-raster-image'
  | 'has-title';

export type LintSeverity = 'error' | 'warning' | 'info';

export interface LintWarning {
  rule: LintRule;
  severity: LintSeverity;
  message: string;
}

export interface IconEntry {
  id: string;
  name: string;
  fileName: string;
  category: string;
  tags: string[];
  path: string;
  absolutePath: string;
  extension: string;
  sizeBytes: number;
  lastModified: number;
  contentHash: string;
  width: number | null;
  height: number | null;
  viewBox: string | null;
  hasCurrentColor: boolean;
  colorCount: number;
  colors: string[];
  isAnimated: boolean;
  lintWarnings: LintWarning[];
  preview: string;
}

// ─── Registry Types ─────────────────────────────────────────

export interface CategoryMeta {
  name: string;
  count: number;
}

export interface IconRegistry {
  version: string;
  generatedAt: string;
  totalCount: number;
  categories: CategoryMeta[];
  icons: IconEntry[];
}

// ─── Cache Types ────────────────────────────────────────────

export interface CachedEntry {
  path: string;
  mtime: number;
  contentHash: string;
  iconEntry: IconEntry;
}

export interface ScanCache {
  version: string;
  configHash: string;
  entries: Record<string, CachedEntry>;
}

// ─── Watcher Types ──────────────────────────────────────────

export type WatchEvent =
  | { type: 'added'; paths: string[] }
  | { type: 'changed'; paths: string[] }
  | { type: 'removed'; paths: string[] };

export type WatchCallback = (event: WatchEvent, registry: IconRegistry) => void;

// ─── Scan Result ────────────────────────────────────────────

export interface ScanResult {
  files: string[];
  scanDurationMs: number;
}

// ─── Optimizer Types ────────────────────────────────────────

export interface OptimizeResult {
  originalSize: number;
  optimizedSize: number;
  savedBytes: number;
  savedPercent: number;
  optimizedContent: string;
}
