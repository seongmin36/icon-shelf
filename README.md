# Icon Shelf

> 프론트엔드 프로젝트를 위한 아이콘 자산 관리 CLI 도구
>
> SVG/PNG 아이콘을 자동 스캔, 검색, 분류, 시각화하는 개발자 전용 도구입니다.

## 주요 기능

- **자동 메타데이터 추출** — SVG viewBox, 색상, 애니메이션 자동 감지
- **2단계 캐싱** — mtime + SHA256 해시로 재스캔 10배 빠름
- **퍼지 검색** — 오타도 찾아주는 가중치 기반 검색
- **자동 분류 (sort)** — 유사한 아이콘끼리 폴더 자동 정리
- **비주얼 프리뷰 (preview)** — 브라우저에서 그리드 형태로 아이콘 시각화
- **파이프라인 명령어** — `init --scan`, `scan --search`로 한 번에 실행
- **SVG 린트** — 6가지 품질 규칙으로 품질 보증
- **파일 감시** — `--watch` 모드로 변경사항 실시간 추적
- **TypeScript 지원** — 완전한 타입 안전성

---

## 설치

### npm 배포 후 (글로벌)

```bash
pnpm add -g @icon-shelf/cli
```

### npm 배포 전 (로컬 개발)

```bash
# icon-shelf 프로젝트에서 글로벌 링크 설정
cd ~/Desktop/Project/icon-shelf/packages/cli
pnpm link --global

# 이후 어떤 프로젝트에서든 사용 가능
icon-shelf init
icon-shelf scan
```

### 프로젝트에 devDependency로 추가

```bash
pnpm add -D @icon-shelf/cli @icon-shelf/core
```

---

## 빠른 시작

```bash
# 1. 설정 파일 생성 + 바로 스캔
icon-shelf init --scan

# 2. 아이콘 검색
icon-shelf search "arrow"

# 3. 유사 아이콘 폴더 정리
icon-shelf sort --dry-run

# 4. 브라우저에서 아이콘 미리보기
icon-shelf preview
```

---

## 명령어

### `init` — 설정 파일 생성

```bash
icon-shelf init           # 설정 파일만 생성
icon-shelf init --scan    # 생성 후 바로 스캔까지
```

프로젝트 루트에 `.icon-shelf.config.json`이 생성됩니다:

```json
{
  "include": ["src/assets/icons"],
  "exclude": ["**/node_modules/**"],
  "extensions": [".svg", ".png", ".jpg", ".webp"],
  "categoryStrategy": "directory",
  "output": {
    "registry": "src/__generated__/icon-registry.json"
  }
}
```

---

### `scan` — 아이콘 스캔 및 레지스트리 생성

```bash
icon-shelf scan                     # 기본 스캔
icon-shelf scan --search "arrow"    # 스캔 후 바로 검색
icon-shelf scan --watch             # 파일 변경 감시 모드
icon-shelf scan --no-cache          # 캐시 없이 전체 재스캔
icon-shelf scan --verbose           # 린트 경고 상세 출력
```

| 옵션 | 설명 |
|------|------|
| `-s, --search <query>` | 스캔 완료 후 바로 검색 실행 |
| `-w, --watch` | 파일 변경 감시 모드 |
| `--no-cache` | 캐시 비활성화 |
| `-v, --verbose` | 린트 경고 상세 출력 |

출력 예시:

```
✓ Found 45 icons in 3 categories

  navigation — 15 icons
  actions — 20 icons
  status — 10 icons

  2 error(s)
  5 warning(s)

  Registry: src/__generated__/icon-registry.json
  Scan: 120ms
```

---

### `search` — 아이콘 검색

```bash
icon-shelf search "arrow"                          # 이름/태그로 검색
icon-shelf search "arrow" --category navigation    # 카테고리 필터
icon-shelf search "close" --limit 5                # 결과 수 제한
```

| 옵션 | 설명 |
|------|------|
| `-c, --category <name>` | 특정 카테고리만 검색 |
| `-l, --limit <number>` | 결과 수 제한 (기본: 10) |

검색 가중치:
- 이름 40%, 태그 30%, 카테고리 20%, 파일명 10%
- 퍼지 검색으로 `"arow"` 검색해도 `"arrow"` 찾음

---

### `sort` — 유사 아이콘 자동 폴더 분류

비슷한 아이콘끼리 자동으로 폴더를 만들어 정리합니다.

```bash
icon-shelf sort                  # 태그 기반 분류 (기본)
icon-shelf sort --strategy color # 색상 기반 분류
icon-shelf sort --dry-run        # 실제 이동 없이 미리보기
```

| 옵션 | 설명 |
|------|------|
| `-d, --dry-run` | 파일 이동 없이 결과만 미리보기 |
| `--strategy <type>` | 분류 전략: `tag` (기본) / `color` |

동작 방식:
1. 모든 아이콘을 스캔하고 태그/색상 메타데이터를 분석
2. 공통 태그(첫 번째 태그)로 1차 그룹핑
3. 미분류 아이콘은 Fuse.js 유사도로 가장 가까운 그룹에 배정
4. 아이콘 1개뿐인 그룹은 `misc/`로 통합
5. 파일 이동 후 빈 폴더 자동 정리
6. 레지스트리 자동 재생성

출력 예시:

```
✓ Grouped 45 icons into 6 folders

  arrow/ — 8 icons
  check/ — 5 icons
  close/ — 3 icons
  menu/ — 4 icons
  search/ — 3 icons
  misc/ — 2 icons

  25 file(s) to move
✓ Moved 25 file(s)
✓ Registry updated
```

---

### `preview` — 브라우저에서 아이콘 시각화

모든 아이콘을 그리드 형태로 브라우저에서 볼 수 있습니다.

```bash
icon-shelf preview           # 기존 레지스트리로 프리뷰 열기
icon-shelf preview --scan    # 스캔 후 프리뷰 열기
```

| 옵션 | 설명 |
|------|------|
| `-s, --scan` | 프리뷰 전에 스캔 먼저 실행 |

기능:
- 카테고리별 탭 필터링
- 실시간 텍스트 검색
- 아이콘 클릭 시 상세 정보 모달 (크기, 경로, 색상, 린트 경고)
- 다크 테마 UI
- SVG는 인라인 렌더링, PNG/JPG는 base64 썸네일

`.icon-shelf/preview.html`에 저장되고 기본 브라우저로 자동 열림.

---

## 파이프라인 조합 예시

```bash
# 초기화부터 스캔까지 한 번에
icon-shelf init --scan

# 스캔하면서 특정 아이콘 바로 찾기
icon-shelf scan --search "arrow"

# 정리하고 프리뷰로 확인
icon-shelf sort && icon-shelf preview

# CI에서 전체 파이프라인
icon-shelf scan --no-cache --verbose
```

---

## 설정 옵션 상세

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `include` | string[] | `["src/assets/icons"]` | 아이콘 검색 경로 |
| `exclude` | string[] | `["**/node_modules/**"]` | 제외 패턴 |
| `extensions` | string[] | `[".svg",".png",".jpg",".webp"]` | 대상 확장자 |
| `categoryStrategy` | string | `"directory"` | `directory` / `prefix` / `none` |
| `output.registry` | string | `"src/__generated__/icon-registry.json"` | 레지스트리 출력 경로 |
| `cache.enabled` | boolean | `true` | 캐시 활성화 |
| `cache.path` | string | `".icon-shelf.cache"` | 캐시 파일 경로 |
| `watch.debounceMs` | number | `200` | 파일 감시 디바운스 |

TypeScript 설정도 가능:

```typescript
// .icon-shelf.config.ts
import { defineConfig } from '@icon-shelf/core';

export default defineConfig({
  include: ['src/assets/icons'],
  extensions: ['.svg', '.png'],
  categoryStrategy: 'directory',
  output: {
    registry: 'src/__generated__/icon-registry.json',
  },
});
```

---

## SVG 린트 규칙

| 규칙 | 심각도 | 설명 |
|------|--------|------|
| `has-viewbox` | error | viewBox 속성 필수 |
| `no-fixed-dimensions` | warning | width/height 하드코딩 금지 |
| `no-inline-style` | warning | inline style 제거 권장 |
| `uses-current-color` | info | currentColor 사용 권장 |
| `no-raster-image` | error | SVG 내 래스터 이미지 금지 |
| `has-title` | warning | 접근성을 위한 title 요소 권장 |

```bash
# 린트 경고 확인
icon-shelf scan --verbose
```

---

## 성능

| 시나리오 | 캐시 없음 | 캐시 있음 |
|---------|----------|---------|
| 50개 아이콘 재스캔 | ~500ms | ~50ms |
| 100개 아이콘 재스캔 | ~1000ms | ~80ms |
| 1개 파일 변경 | ~500ms | ~60ms |

2단계 캐싱: mtime 비교(0.1ms/파일) 후 변경 시에만 SHA256 해시(1ms/파일) 검증.

---

## 프로젝트 구조

```
icon-shelf/
  packages/
    core/              # @icon-shelf/core — 핵심 엔진
      src/
        types.ts       # 타입 정의
        config.ts      # 설정 로드
        scanner.ts     # 파일 탐색 (fast-glob)
        parser.ts      # SVG/래스터 메타데이터 파싱
        cache.ts       # 2단계 캐시 (msgpackr)
        registry.ts    # 레지스트리 생성
        watcher.ts     # 파일 감시 (chokidar)
        optimizer.ts   # SVG 최적화 (SVGO)
    cli/               # @icon-shelf/cli — CLI 도구
      src/
        commands/
          init.ts      # init 명령어
          scan.ts      # scan 명령어
          search.ts    # search 명령어
          sort.ts      # sort 명령어
          preview.ts   # preview 명령어
```

---

## 라이선스

MIT
