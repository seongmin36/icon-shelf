# Icon Shelf

> **프론트엔드 프로젝트를 위한 자동 아이콘 관리 도구**
>
> SVG/PNG 아이콘 자산을 자동으로 스캔하고, 강력한 검색·메타데이터 관리·자동 최적화 기능을 제공하는 개발자 전용 CLI 도구입니다.

[![GitHub](https://img.shields.io/badge/GitHub-icon--shelf-blue?logo=github)](https://github.com/seongmin36/icon-shelf)
[![License](https://img.shields.io/badge/License-MIT-green)](#라이선스)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](#필요-사항)

## 주요 기능

- **자동 메타데이터 추출** - SVG viewBox, 색상, 애니메이션 자동 감지
- **극적 성능 향상** - 2단계 캐싱으로 재스캔 시간 10배 단축
- **강력한 검색** - 퍼지 검색으로 오타도 찾아냄
- **자동 카테고리화** - 폴더 구조 기반 자동 분류
- **품질 검사** - 6가지 린트 규칙으로 SVG 품질 보증
- **파일 감시** - --watch 모드로 변경사항 실시간 추적
- **JSON 레지스트리** - 빌드 프로세스 통합 가능한 표준화된 포맷
- **TypeScript 지원** - 완전한 타입 안전성

## 설치

### 글로벌 설치

```bash
npm install -g @icon-shelf/cli
# 또는
pnpm add -g @icon-shelf/cli
```

### 프로젝트에 추가

```bash
npm install --save-dev @icon-shelf/cli @icon-shelf/core
# 또는
pnpm add -D @icon-shelf/cli @icon-shelf/core
```

## 빠른 시작

### 1. 프로젝트 초기화

```bash
npx icon-shelf init
```

프로젝트 루트에 `.icon-shelf.config.json` 파일이 생성됩니다:

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

### 2. 아이콘 스캔

```bash
npx icon-shelf scan
```

**출력 예시:**
```
✓ Found 45 icons in 3 categories
  • navigation: 15 icons
  • actions: 20 icons
  • status: 10 icons

⚠ Lint warnings:
  • 2 icons missing viewBox
  • 5 icons using inline styles

✓ Generated: icon-registry.json
```

### 3. 아이콘 검색

```bash
npx icon-shelf search "arrow"
```

**출력 예시:**
```
Results (2/45):

1. arrowLeft
   Path: navigation/arrow-left.svg
   Tags: arrow, left
   Size: 24x24

2. arrowRight
   Path: navigation/arrow-right.svg
   Tags: arrow, right
   Size: 24x24
```

## 사용 방법

### 명령어 상세 설명

#### `icon-shelf init`

프로젝트에 설정 파일을 생성합니다.

```bash
npx icon-shelf init
```

**기능:**
- `.icon-shelf.config.json` 생성
- 기본 설정 템플릿 포함
- 이미 존재하면 경고 메시지 표시

---

#### `icon-shelf scan`

아이콘 레지스트리를 생성합니다.

```bash
npx icon-shelf scan [options]
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--watch` | 파일 변경 감시 모드 | false |
| `--no-cache` | 캐시 비활성화 | false |
| `--verbose` | 상세 린트 경고 출력 | false |

**예제:**

```bash
# 일반 스캔
npx icon-shelf scan

# 개발 중 파일 변경 감시
npx icon-shelf scan --watch

# 캐시 비활성화 (전체 재스캔)
npx icon-shelf scan --no-cache

# 상세 경고 출력
npx icon-shelf scan --verbose
```

**성능:**
- 첫 실행: ~500ms (50개 아이콘)
- 재실행 (캐시): ~50ms (10배 빠름!)
- 파일 변경 감지: 200ms (배치 처리)

---

#### `icon-shelf search`

아이콘을 검색합니다.

```bash
npx icon-shelf search [query] [options]
```

**옵션:**

| 옵션 | 설명 | 예제 |
|------|------|------|
| `--category <name>` | 특정 카테고리 필터 | `--category navigation` |
| `--limit <number>` | 결과 수 제한 | `--limit 5` |

**예제:**

```bash
# 모든 "arrow" 아이콘 검색
npx icon-shelf search "arrow"

# navigation 카테고리에서만 검색
npx icon-shelf search "arrow" --category navigation

# 결과를 5개로 제한
npx icon-shelf search "icon" --limit 5

# 오타도 찾아줌 (퍼지 검색)
npx icon-shelf search "arow"  # "arrow" 찾음
```

**검색 가중치:**
- 이름 (name): 40%
- 태그 (tags): 30%
- 카테고리 (category): 20%
- 파일명 (fileName): 10%

---

### 설정 파일 상세

`.icon-shelf.config.json` 또는 `.icon-shelf.config.ts` / `.icon-shelf.config.js`:

```json
{
  "include": ["src/assets/icons"],
  "exclude": ["**/node_modules/**", "**/.git/**"],
  "extensions": [".svg", ".png", ".jpg", ".webp"],
  "categoryStrategy": "directory",
  "output": {
    "registry": "src/__generated__/icon-registry.json"
  },
  "cache": true,
  "watch": false,
  "optimize": true
}
```

**설정 옵션:**

| 옵션 | 타입 | 필수 | 설명 | 기본값 |
|------|------|------|------|--------|
| `include` | string[] | ✓ | 검색 대상 경로 | - |
| `exclude` | string[] | - | 제외 패턴 | `["**/node_modules/**"]` |
| `extensions` | string[] | ✓ | 지원 확장자 | - |
| `categoryStrategy` | string | ✓ | 카테고리 전략 (`directory` \| `prefix` \| `none`) | `"directory"` |
| `output.registry` | string | ✓ | 출력 레지스트리 파일 경로 | - |
| `cache` | boolean | - | 캐싱 활성화 | `true` |
| `watch` | boolean | - | 감시 모드 | `false` |
| `optimize` | boolean | - | SVG 최적화 | `false` |

---

## 사용 예제

### 예제 1: 기본 프로젝트 구조

```
my-project/
├── src/
│   ├── assets/icons/
│   │   ├── navigation/
│   │   │   ├── arrow-left.svg
│   │   │   ├── arrow-right.svg
│   │   │   └── menu.svg
│   │   ├── actions/
│   │   │   ├── close.svg
│   │   │   ├── copy.svg
│   │   │   └── delete.svg
│   │   └── status/
│   │       ├── error.svg
│   │       ├── success.svg
│   │       └── warning.svg
│   └── __generated__/
│       └── icon-registry.json
├── .icon-shelf.config.json
└── package.json
```

**실행 결과:**

```bash
$ npx icon-shelf scan
✓ Found 9 icons in 3 categories
  • navigation: 3 icons
  • actions: 3 icons
  • status: 3 icons
✓ Generated: icon-registry.json
```

---

### 예제 2: 개발 워크플로우

```bash
# 터미널 1: 개발 서버
pnpm dev

# 터미널 2: 아이콘 감시
npx icon-shelf scan --watch
```

새로운 아이콘을 추가하면 자동으로 감지됩니다:

```
[watch] Added: navigation/menu-open.svg
✓ Updated icon-registry.json (10 icons)
```

---

### 예제 3: CI/CD 통합

**GitHub Actions:**

```yaml
name: Validate Icons

on: [push, pull_request]

jobs:
  icons:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Generate icon registry
        run: npx icon-shelf scan

      - name: Check SVG quality
        run: |
          if grep -q '"rule":"has-viewbox"' src/__generated__/icon-registry.json; then
            echo "Error: Missing viewBox in SVG files"
            exit 1
          fi
          echo "✓ All SVG icons are valid"
```

---

## 생성된 레지스트리 (icon-registry.json)

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-03-19T15:30:00Z",
  "totalCount": 45,
  "categories": [
    { "name": "navigation", "count": 15 },
    { "name": "actions", "count": 20 },
    { "name": "status", "count": 10 }
  ],
  "icons": [
    {
      "id": "navigation/arrow-left",
      "name": "arrowLeft",
      "fileName": "arrow-left.svg",
      "category": "navigation",
      "tags": ["arrow", "left"],
      "path": "src/assets/icons/navigation/arrow-left.svg",
      "absolutePath": "/project/src/assets/icons/navigation/arrow-left.svg",
      "extension": ".svg",
      "sizeBytes": 1024,
      "lastModified": 1710861000000,
      "contentHash": "a1b2c3d4e5f6",
      "width": 24,
      "height": 24,
      "viewBox": "0 0 24 24",
      "hasCurrentColor": false,
      "colorCount": 1,
      "colors": ["#000000"],
      "isAnimated": false,
      "lintWarnings": [],
      "preview": "<svg viewBox=\"0 0 24 24\">...</svg>"
    }
  ]
}
```

---

## 린트 규칙

Icon Shelf는 6가지 SVG 품질 규칙을 적용합니다:

| 규칙 | 심각도 | 설명 | 개선 효과 |
|------|--------|------|---------|
| `has-viewbox` | ERROR | SVG에 viewBox 속성 필수 | 확장성 보증 |
| `no-fixed-dimensions` | WARNING | width/height 하드코딩 금지 | 유연한 스케일링 |
| `no-inline-style` | WARNING | inline style 제거 | 외부 CSS 통합 |
| `uses-current-color` | INFO | currentColor 사용 권장 | 테마 색상 상속 |
| `no-raster-image` | WARNING | 래스터 이미지 내장 금지 | 유지보수성 |
| `has-title` | INFO | `<title>` 요소 추가 | 접근성 |

**린트 결과 확인:**

```bash
npx icon-shelf scan --verbose
```

---

## 성능 특징

### 캐싱 시스템

2단계 변경 감지로 극적인 성능 향상을 제공합니다:

```
1단계: mtime 비교 (~0.1ms/파일)
  ✓ 빠른 변경 감지

2단계: SHA256 해시 비교 (~1ms/파일)
  ✓ 정확한 변경 감지
  ✓ 파일 touch 시에도 안전
```

**성능 비교:**

| 시나리오 | 캐시 없음 | 캐시 있음 | 개선도 |
|--------|----------|---------|-------|
| 50개 아이콘 (재스캔) | 500ms | 50ms | **10배** |
| 100개 아이콘 (재스캔) | 1000ms | 80ms | **12배** |
| 1개 파일 변경 | 500ms | 60ms | **8배** |

### 메모리 효율

- 캐시: ~1KB per icon (msgpackr 직렬화)
- 메모리: ~10MB per 10,000 icons
- 디스크: ~1-5MB per 10,000 icons

---

## TypeScript 지원

TypeScript 설정 사용:

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

**타입 안전성:**

```typescript
import type { IconRegistry } from '@icon-shelf/core';
import registry from './icon-registry.json';

const icons: IconRegistry = registry;

// 완전한 타입 힌트 제공
icons.icons.forEach((icon) => {
  console.log(icon.name);  // ✓ name 속성 자동완성
  console.log(icon.viewBox);  // ✓ viewBox 자동완성
});
```

---

## 일반적인 문제 해결

### Q: "Config file not found" 에러

**A:** `.icon-shelf.config.json` 파일을 생성해주세요:

```bash
npx icon-shelf init
```

---

### Q: 아이콘이 발견되지 않음

**A:** 설정 파일의 `include` 경로를 확인하세요:

```json
{
  "include": ["src/assets/icons"],  // 실제 경로 확인
  "extensions": [".svg", ".png"]     // 파일 확장자 확인
}
```

---

### Q: 린트 경고를 무시하고 싶습니다

**A:** 경고는 정보 제공 목적이며, 강제하지 않습니다. 다만 SVG 품질 향상을 위해 권장됩니다.

---

### Q: 캐시를 초기화하려면?

**A:** 다음 중 하나를 선택하세요:

```bash
# 캐시 없이 스캔
npx icon-shelf scan --no-cache

# 캐시 파일 직접 삭제
rm .icon-shelf.cache
npx icon-shelf scan
```

---

### Q: watch 모드에서 반응이 없습니다

**A:** 파일이 안정적으로 저장되기를 기다립니다:

```bash
# --watch는 200ms 디바운스를 적용합니다
# 대량 파일 추가 시 최대 200ms 대기
npx icon-shelf scan --watch
```

---

## 다음 단계

### Phase 2 (예정)

- React/Vue 컴포넌트 자동 생성
- TypeScript 인터페이스 생성
- CSS-in-JS 지원

### Phase 3 (예정)

- 웹 UI 대시보드
- 실시간 아이콘 검색
- 아이콘 미리보기

### Phase 4 (예정)

- Figma 플러그인
- 자동 동기화

### Phase 5 (예정)

- 클라우드 동기화
- 팀 협업
- 버전 관리

---

## 기여하기

Icon Shelf는 오픈소스 프로젝트입니다. 기여를 환영합니다!

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 라이선스

MIT License - [LICENSE](./LICENSE) 파일 참고

---

## 문의 및 지원

- [상세 문서](https://github.com/seongmin36/icon-shelf/wiki)
- [이슈 제보](https://github.com/seongmin36/icon-shelf/issues)
- [토론](https://github.com/seongmin36/icon-shelf/discussions)

---

**Made for frontend teams**
