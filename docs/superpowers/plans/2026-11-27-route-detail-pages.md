# 航路詳細ページ（静的）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 国内・国際・韓国の全航路に `/route/<routeId>/` の静的詳細ページ（本文は JS なしで読め、地図は後読み込み）を生成し、一覧・JSON-LD・llms-full.txt から詳細ページへリンクする。

**Architecture:** searoute-pmtiles の `generate-lightweight-json.mjs` が geojson と詳細 JSON から `lightweight/routePages.json`（港座標つき）を出力する。searoute のビルド（`vite.config.ts` の `prerenderPages`）がそれを 1 回取得し、`routeDetail.html` のビルド結果を雛形に React SSR で `route/<id>/index.html` を書き出す。地図は `main-routeDetail.tsx` が初回描画後に MapLibre を動的 import して既存 pmtiles を routeId で絞って描く。

**Tech Stack:** Vite 8 / React 19（renderToString）/ Tailwind v4 / MapLibre GL + pmtiles / Vitest + jsdom / Playwright。pmtiles 側は Node.js（依存なし、`node:test`）。

**Spec:** `docs/superpowers/specs/2026-11-27-route-detail-pages-design.md`

## Global Constraints

- 対象レイヤーは `seaRoute`・`seaRoute_international`・`seaRoute_KR` のみ。`seaRoute_limited` は集約 JSON にもページにも入れない
- 詳細ページの URL は `/route/<routeId>/`（末尾スラッシュ付き）。canonical・内部リンク・JSON-LD・llms-full.txt すべてこの形。出力ファイルは `route/<routeId>/index.html`
- routeId が重複したらビルド（pmtiles 側の生成・サイト側のプリレンダー両方）を失敗させる
- 集約 JSON の配信 URL：`${ROUTE_DATA_BASE_URL}/lightweight/routePages.json`
- 港座標は小数第 5 位に丸める
- 詳細ページ内のリンク・アセットはすべて絶対パス（`/`, `/routeList`, `/img/...`）。`./` は `/route/x/` 配下で壊れる
- ベースカラー `#bfd9f2`（`--rl-sea`）系の既存 CSS 変数を使う。近似色を新設しない
- 地図スタイル `/style/maptiler-basic-ja-custom.json`、pmtiles は `src/config/routeLayers.ts` の `UNIFIED_PMTILES_PATH` と同じ `${ROUTE_DATA_BASE_URL}/searoute.pmtiles`
- MapLibre は `maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url` で `setWorkerUrl` する（`src/adapters/map/mapFactory.ts:10,38` と同じ）。`import * as maplibregl from 'maplibre-gl'`（default import は不可）
- 地図の高さ PC 340px / スマホ（max-width 600px 相当）260px、`cooperativeGestures: true`、ズームボタンあり（コンパスなし）
- コミットメッセージは日本語、`Co-Authored-By` 行を付けない
- vitest は大文字ドライブ `C:\MyPrograms\waiwai\searoute` から実行する（小文字 `c:\` だとテストが拾われないことがある）
- モック `mock-route-detail.html`（リポジトリ直下・未追跡）が合意済みの見た目の参考。コミットしない

## Review Focus

1. 値が欠けた航路（`url`・`freqInfo`・`shipName`・`businessName` なし、`ports` 0 件）でもページが壊れず、該当行・ボタン・JSON-LD の該当プロパティだけが消える → Task 2・3 のテストに含める
2. HTML 特殊文字（`<`, `"`, `&`）を含む航路名・事業者名が head（title・meta・JSON-LD）で正しくエスケープされる（JSON-LD は `<` を `\u003c`）→ Task 2 のテストに含める
3. 一覧の行に対応する詳細ページがない（データ不整合）とリンク切れになる → Task 6 でプリレンダー時に一覧の routeId がすべて routePages にあるか検査し、なければビルド失敗
4. `/route/10101`（スラッシュなし）でアクセスされても成立する（Cloudflare Pages は 308 で `/route/10101/` へ。ページ内リンクが絶対パスであること）→ Task 3 のテストで相対リンクがないことを確認
5. 港が 1 つだけ・同名港が複数フィーチャーに出る航路で発着港が重複しない → Task 1 のテストに含める

---

## リポジトリ・ブランチ

- searoute-pmtiles（`C:\MyPrograms\waiwai\searoute-pmtiles`）：`main` から `feature/route-pages-json` を切る。Task 1 のみ
- searoute（`C:\MyPrograms\waiwai\searoute`）：既存の `feature/route-detail-pages`（develop ベース）。Task 2〜7
- **マージ順**：pmtiles の PR を先にマージして R2 に `routePages.json` が出てから、searoute を develop→main へ（出ていないと本番ビルドが取得失敗で落ちる）

---

### Task 1: 詳細ページ用の集約 JSON を生成する（searoute-pmtiles）

**Files:**
- Modify: `scripts/generate-lightweight-json.mjs`
- Create: `scripts/generate-lightweight-json.test.mjs`
- Modify: `.github/workflows/deploy-r2.yml`（Generate lightweight JSON の前に `node --test scripts/` を実行するステップ）
- Modify: `README.md`（出力物の説明に `lightweight/routePages.json` を追記）

**Interfaces:**
- Produces（ファイル形式。Task 2 が読む）:
  ```json
  { "generatedAt": "ISO8601", "totalRecords": 583,
    "records": [ { "routeId": "10101", "layer": "seaRoute",
      "businessName": "...", "routeName": "...", "url": "...", "info": "...",
      "freq": 3, "freqInfo": "...", "car": 1, "bike": 1, "bicycle": 1,
      "shipName": "...", "note": "season", "bbox": [w, s, e, n], "lastChecked": "2026-11-25",
      "ports": [ { "name": "稚内", "lon": 141.68254, "lat": 45.41617 } ] } ] }
  ```
  - `routeId` は常に文字列。詳細 JSON の項目はあるものだけ入れる。`ports` は常に配列
  - records は routeId 昇順（既存の lightweight と同じ比較）
- Produces（export。テスト用）: `extractPorts(features: Feature[]): {name,lon,lat}[]`, `buildRoutePageRecords(datasets: {layer, features, detailsMap}[]): Record[]`
- `seaRoute_limited` は入力に含めない

- [ ] **Step 1: ブランチを切る** `git -C C:\MyPrograms\waiwai\searoute-pmtiles checkout -b feature/route-pages-json`
- [ ] **Step 2: 失敗するテストを書く**（`node:test` + `node:assert/strict`）
  - `extractPorts`: MultiLineString 2 本（稚内→鴛泊、稚内→香深）＋ LineString（鴛泊→香深）から `[稚内, 鴛泊, 香深]` の 3 件・出現順・座標は 1 本目の始点/終点を小数第 5 位に丸めた値
  - `extractPorts`: `portName2` がないフィーチャーは終点を追加しない／フィーチャー 0 件なら `[]`
  - `buildRoutePageRecords`: routeId 数値 10101 → `"10101"`、`layer` が付く、詳細 JSON の `freqInfo`・`lastChecked`・`bbox` がそのまま入る、詳細 JSON がない routeId でも `ports` 付きで出る
  - `buildRoutePageRecords`: 異なるレイヤーに同じ routeId があると throw（メッセージに routeId を含む）
- [ ] **Step 3: 失敗を確認** `node --test scripts/` → FAIL（export がない）
- [ ] **Step 4: 実装**。`main()` は `import.meta.url === pathToFileURL(process.argv[1]).href` のときだけ実行し、テストから import できるようにする。既存 4 データセットの出力は変えず、最後に 3 レイヤー分から `lightweight/routePages.json` を書く。始点＝最初の線の最初の座標、終点＝最後の線の最後の座標（LineString は 1 本の配列として扱う）
- [ ] **Step 5: テスト成功を確認** `node --test scripts/` → PASS
- [ ] **Step 6: 実データで生成を確認** `node scripts/generate-lightweight-json.mjs` → `lightweight/routePages.json` の records 件数が 583（487+55+41）前後、10101 の ports が 稚内・鴛泊・香深。`lightweight/` はコミットしない（`git status` に出たら `.gitignore` に `/lightweight/` を追加）
- [ ] **Step 7: workflow・README を更新してコミット** `feat: 詳細ページ用の集約JSON（routePages.json）を生成する`
- [ ] **Step 8: push と PR 作成**（ベース main、本文に Claude Code の生成行を書かない）。マージはユーザーが行う（`--merge`）

---

### Task 2: 詳細ページのデータ型と head（メタ情報・JSON-LD）

**Files:**
- Create: `src/domain/routePage.ts`
- Create: `src/application/routeDetailPublication.ts`
- Test: `tests/domain/routePage.test.ts`, `tests/application/routeDetailPublication.test.ts`

**Interfaces:**
- Produces（`src/domain/routePage.ts`）:
  - `interface RoutePort { name: string; lon: number; lat: number }`
  - `interface RoutePageRecord { routeId: string; layer: RoutePageLayer; businessName?; routeName?; url?; info?; freq?: number; freqInfo?; car?: number; bike?: number; bicycle?: number; shipName?; note?; bbox?: [number, number, number, number]; lastChecked?; ports: RoutePort[] }`
  - `type RoutePageLayer = 'seaRoute' | 'seaRoute_international' | 'seaRoute_KR'`
  - `const ROUTE_PAGE_LAYERS: Record<RoutePageLayer, { sourceId: RouteLayerId; label: string; anchorId: string }>` — seaRoute→`geojson_sea_route`/`国内航路`/`domestic`、seaRoute_international→`geojson_international_sea_route`/`国際航路`/`international`、seaRoute_KR→`geojson_KR_sea_route`/`韓国 国内航路`/`korea`
  - `normalizeRoutePages(data: unknown): RoutePageRecord[]` — `records` 配列を読み、未知レイヤーは捨て、routeId 重複で throw、`ports` がなければ `[]`、routeId 昇順（`compareRouteIds`）
  - `buildRouteDetailPath(routeId: string): string` → `/route/${encodeURIComponent(routeId)}/`
  - `getVehicleLabels(record): string[]` → `car/bike/bicycle === 1` の順に `自動車`・`バイク`・`自転車`
  - `getRelatedRoutes(record, all: RoutePageRecord[]): RoutePageRecord[]` — 同じ `businessName`（空なら `[]`）、自分以外、routeId 昇順、最大 10 件
- Produces（`src/application/routeDetailPublication.ts`）:
  - `buildRouteDetailTitle(record): string` → `<事業者> <航路名> | おでかけ航路マップ`（事業者なしなら `<航路名> | おでかけ航路マップ`）
  - `buildRouteDetailDescription(record): string` → `「<事業者>の<航路名>航路。発着港：A・B・C。運航頻度：<freqInfo>。使用船舶：<shipName の「, 」を「、」に>。<車両>の航送可。最新の時刻表は運航事業者の公式サイトで確認できます。」` 欠けた部分の文は省く
  - `buildRouteDetailHead(record, siteUrl: string): string` → `<title>`、description、canonical（`siteUrl + buildRouteDetailPath`）、og:url/og:title/og:description/og:type=article/og:image（`https://searoute.info/img/banner.png`）、twitter:card/title/description/image（`/img/twbanner.png`）、JSON-LD 2 本（`BoatTrip` と `BreadcrumbList`）を連結した文字列。属性値・本文は HTML エスケープ
  - JSON-LD `BoatTrip`: `name`=`事業者 航路名`、`url`、`provider`={`@type`:'Organization', name: businessName, url?: url}（事業者なしなら provider ごと省略）、`departureBoatTerminal`=ports[0]、`arrivalBoatTerminal`=ports[末尾]（2 港以上のときだけ。各 {`@type`:'BoatTerminal', name, geo:{`@type`:'GeoCoordinates', latitude, longitude}}）。`BreadcrumbList`: おでかけ航路マップ(`/`) › 航路一覧(`/routeList`) › レイヤー名(`/routeList#<anchorId>`) › 航路名。どちらも `<` を `\u003c` に置換（`routeListPublication.ts` の `buildRouteListJsonLd` と同じ）

- [ ] **Step 1: domain のテストを書く**：`normalizeRoutePages`（limited レイヤー除外・重複 throw・ports 補完・並び順）、`buildRouteDetailPath('10101')==='/route/10101/'`、`getVehicleLabels({car:1,bike:0,bicycle:1})` → `['自動車','自転車']`、`getRelatedRoutes`（自分除外・事業者空で `[]`・11 件中 10 件）
- [ ] **Step 2: application のテストを書く**：10101 相当のレコードで title・description の完全一致文字列、canonical `https://searoute.info/route/10101/`、JSON-LD をパースして BoatTrip の発着＝稚内／香深と geo、BreadcrumbList 4 要素。欠損レコード（`{routeId:'9', layer:'seaRoute', routeName:'A', ports:[]}`）で description が `「Aの航路。…」` ではなく事業者の文を省いた形になり、BoatTrip に provider・発着がない。航路名 `<b>"x"&` で `<title>` と meta にエスケープ済み文字列、JSON-LD に生の `<` がない
- [ ] **Step 3: 失敗を確認** `npx vitest run tests/domain/routePage.test.ts tests/application/routeDetailPublication.test.ts` → FAIL
- [ ] **Step 4: 実装**（description の欠損時の文面は「事業者なし → `<航路名>航路。`」）
- [ ] **Step 5: 成功を確認**（同コマンド → PASS）、`npm run typecheck`・`npm run lint` も通す
- [ ] **Step 6: コミット** `feat: 航路詳細ページのデータ型とメタ情報・構造化データを追加`

---

### Task 3: 詳細ページのコンポーネント（共通ヘッダーの切り出しを含む）

**Files:**
- Create: `src/presentation/common/SiteHeader.tsx`
- Modify: `src/presentation/routeList/RouteListPage.tsx`（ヘッダーを `SiteHeader` に置き換え。出力 HTML は不変）
- Create: `src/presentation/routeDetail/RouteDetailPage.tsx`
- Modify: `src/styles/tailwind.css`（必要ならページ固有のスタイル。既存 `--rl-*` 変数を使う）
- Test: `tests/presentation/routeDetail/routeDetailPage.test.tsx`（`@vitest-environment jsdom`）

**Interfaces:**
- Consumes: Task 2 の `RoutePageRecord`・`ROUTE_PAGE_LAYERS`・`buildRouteDetailPath`・`getVehicleLabels`・`getRelatedRoutes`、既存 `buildRouteMapPath`（`src/domain/route.ts:133`）、`getRouteInfoFromNote`
- Produces:
  - `SiteHeader({ rootHref, current }: { rootHref: './' | '/'; current: 'map' | 'routeList' | null })` — マップ `rootHref`、航路一覧 `${rootHref}routeList`。`current` に `aria-current="page"` と強調クラス
  - `RouteDetailPage({ record, related }: { record: RoutePageRecord; related: RoutePageRecord[] })`
  - 地図の差し込み口：`<div id="route-detail-map" data-route-id data-source-layer data-bbox data-ports aria-label="航路の地図">`（`data-bbox`・`data-ports` は JSON 文字列。`data-source-layer` は record.layer）。高さはクラスで PC 340px / スマホ 260px、背景 `--rl-sea-tint`、枠 `--rl-sea`

ページ構成はモック `mock-route-detail.html` に合わせる（spec「ページ構成」の 1〜8）。要点：
- パンくず `nav[aria-label="パンくずリスト"]`：`/` › `/routeList` › `/routeList#<anchorId>`（レイヤー名）› 航路名
- `p` 事業者名 → `h1` 航路名 → バッジ（レイヤー名、`getRouteInfoFromNote(note)`、車両ラベル）
- 「大きな地図で見る」は `/` + `buildRouteMapPath(...)` の `./` を除いた形（`/?share=route&routeId=..&sourceId=..`）。「時刻表（公式サイト）」は `url` があるときだけ、`target="_blank" rel="noopener noreferrer"`
- `h2` 航路の情報 → `dl`：事業者／発着港（港名を ⇄ でつなぐ）／運航頻度（freqInfo）／船名（「, 」→「、」）／車両航送（`自動車・バイク・自転車 可`。ラベルなしなら行ごと省略）／情報（info）／情報確認日（lastChecked）。値なしの行は出さない
- `h2` 同じ事業者の航路（related が空ならセクションごと出さない）→ 各リンクは `buildRouteDetailPath`
- 注意書き（モックの文面のまま）
- アイコンは既存 `Icon`（`fas fa-map` など）を使い、モックの絵文字は使わない

- [ ] **Step 1: 失敗するテストを書く**：10101 相当＋related 1 件で、h1・事業者・dl の dt 一覧 `['事業者','発着港','運航頻度','船名','車両航送','情報確認日']`・発着港テキスト `稚内⇄鴛泊⇄香深`（空白除去後）・地図ボタン href `/?share=route&routeId=10101&sourceId=geojson_sea_route`・公式ボタン href と target・related リンク `/route/10102/`・`#route-detail-map` の data 属性（JSON.parse で bbox と ports が戻る）。欠損レコードで dt が `['発着港']` のみ（ports 1 件）／公式ボタンなし／related セクションなし。**すべての `a[href]` が `/` か `http` で始まる**（相対リンクなし）
- [ ] **Step 2: `RouteListPage` 既存テストと `tests/entrypoints/prerender.test.tsx` が通ることを先に確認**（ヘッダー切り出しの安全網）
- [ ] **Step 3: 失敗を確認** `npx vitest run tests/presentation/routeDetail` → FAIL
- [ ] **Step 4: 実装**（`SiteHeader` 切り出し → `RouteDetailPage`）
- [ ] **Step 5: 成功を確認** `npm test` 全体 PASS（一覧の出力 HTML が変わっていないこと）、typecheck・lint
- [ ] **Step 6: コミット** `feat: 航路詳細ページのコンポーネントを追加し、共通ヘッダーを切り出す`

---

### Task 4: ビルドで詳細ページを書き出す

**Files:**
- Create: `routeDetail.html`（雛形。head に `<!-- searoute:route-head -->`、`<!-- searoute:icon-css -->`・`<!-- searoute:entry-css -->` プレースホルダー、favicon 等は絶対パス `/img/...`、`<meta name="robots" content="index,follow,max-image-preview:large">`、body は `<div id="app"></div>` と `<script type="module" src="./src/entrypoints/main-routeDetail.tsx">`）
- Create: `src/entrypoints/main-routeDetail.tsx`（tailwind.css の import と `loadGoogleAnalytics()` のみ。地図は Task 5）
- Modify: `src/entrypoints/prerender.tsx`
- Modify: `vite.config.ts`（`rollupOptions.input` に `routeDetail`、`prerenderPages` で詳細ページを書き出し、最後に `dist/routeDetail.html` を削除）
- Create: `tests/fixtures/routePages.json`（10101・10102（同事業者）・KR010101 の 3 件。値は実データ準拠）
- Modify: `playwright.config.ts`（webServer.env に `SEAROUTE_ROUTE_PAGES_FILE: 'tests/fixtures/routePages.json'`）
- Test: `tests/entrypoints/prerender.test.tsx` に追記

**Interfaces:**
- Consumes: Task 2 `normalizeRoutePages`・`buildRouteDetailHead`・`getRelatedRoutes`・`buildRouteDetailPath`、Task 3 `RouteDetailPage`
- Produces（`prerender.tsx`）:
  - `loadPrerenderRoutePages(): Promise<RoutePageRecord[]>` — `process.env.SEAROUTE_ROUTE_PAGES_FILE` があればそのファイルを読む。なければ `SEAROUTE_SKIP_ROUTE_DATA === '1'` で `[]`。それ以外は `${ROUTE_DATA_BASE_URL}/lightweight/routePages.json?v=<Date.now()>` を `FETCH_TIMEOUT_MS` で取得（失敗は reject）。結果は `normalizeRoutePages`
  - `renderRouteDetailPages(records: RoutePageRecord[]): Array<{ fileName: string; page: PrerenderedPage }>` — `fileName` = `route/<encodeURIComponent(id)>/index.html`、`page.app` = `RouteDetailPage` の SSR、`page.head` = `buildRouteDetailHead(record, SITE_URL)`
- `vite.config.ts`：既存の「`<div id="app">` 置換・head・bodyEnd 差し込み」を関数 `applyPrerenderedPage(html: string, page): string` に切り出して共用。詳細ページは `dist/routeDetail.html` を雛形として読み、`<!-- searoute:route-head -->` を `page.head` で置換して書き出す（ディレクトリは `mkdir -p`）。書き出し後に `dist/routeDetail.html` を `rm`

- [ ] **Step 1: 失敗するテストを書く**（prerender.test.tsx）：`renderRouteDetailPages(fixture)` が 3 件、fileName `route/10101/index.html`、app に h1、head に canonical。`loadPrerenderRoutePages` が `SEAROUTE_ROUTE_PAGES_FILE` を読む（`vi.stubEnv`）／`SEAROUTE_SKIP_ROUTE_DATA=1` で `[]`／fetch をスタブして URL が `/lightweight/routePages.json?v=` を含む
- [ ] **Step 2: 失敗を確認** `npx vitest run tests/entrypoints/prerender.test.tsx` → FAIL
- [ ] **Step 3: 実装**
- [ ] **Step 4: 成功を確認**（同コマンド PASS、`npm test` 全体 PASS）
- [ ] **Step 5: 実ビルドで確認** `SEAROUTE_ROUTE_PAGES_FILE=tests/fixtures/routePages.json SEAROUTE_SKIP_ROUTE_DATA=1 npm run build` → `dist/route/10101/index.html` に h1・`<link rel="canonical" href="https://searoute.info/route/10101/">`・JSON-LD・`/assets/` の CSS/JS、`<!-- searoute:` が残っていない、`dist/routeDetail.html` がない
- [ ] **Step 6: コミット** `feat: ビルド時に航路詳細ページを静的生成する`

---

### Task 5: 詳細ページの埋め込み地図

**Files:**
- Create: `src/presentation/routeDetail/routeDetailMap.ts`
- Modify: `src/entrypoints/main-routeDetail.tsx`（`afterFirstPaint` で `import('../presentation/routeDetail/routeDetailMap')` → `mountRouteDetailMap(document.getElementById('route-detail-map'))`。要素がなければ何もしない）
- Test: `tests/presentation/routeDetail/routeDetailMap.test.ts`、`tests/e2e/route-detail.spec.ts`

**Interfaces:**
- Consumes: Task 3 の `#route-detail-map` と data 属性
- Produces:
  - `readRouteDetailMapOptions(element: HTMLElement): { routeId: string; sourceLayer: string; bbox?: [number,number,number,number]; ports: RoutePort[] } | null` — data 属性が壊れていれば `null`（JSON パース失敗・routeId なし）
  - `mountRouteDetailMap(element: HTMLElement | null): Promise<void>` — maplibre-gl・pmtiles・`maplibre-gl/dist/maplibre-gl.css` を動的 import、`setWorkerUrl`、`addProtocol('pmtiles', new Protocol().tile)`、`bounds: bbox`（`fitBoundsOptions.padding: 40`。bbox がなく ports があれば ports から境界を作る。どちらもなければ地図を出さない）、`cooperativeGestures: true`、`attributionControl: { compact: true }`、`NavigationControl({ showCompass: false })`。load 後に vector source（`pmtiles://${ROUTE_DATA_BASE_URL}/searoute.pmtiles`）と line レイヤー（`source-layer` = sourceLayer、filter `['==', ['to-string', ['get','routeId']], routeId]`、`line-color` は `['coalesce', ['get','color'], '#1f4e79']`、`line-width` 4）、港ごとに港名ラベルの Marker（白地・`--rl-sea-ink` 枠のクラス）

- [ ] **Step 1: 失敗するテストを書く**：`readRouteDetailMapOptions` が正常値を返す／`data-ports` が不正 JSON なら `null`／`data-bbox` なしでも ports は返る
- [ ] **Step 2: 失敗を確認** → FAIL
- [ ] **Step 3: 実装**
- [ ] **Step 4: 成功を確認** → PASS、typecheck・lint
- [ ] **Step 5: E2E を書く**（`tests/e2e/route-detail.spec.ts`。`prerender.spec.ts` の `collectReactErrors` と同じノイズ除外でページエラーを集める）：JS 無効で `/route/10101/` の h1・発着港・`#route-detail-map` が見える。JS 有効でページエラー 0 件、`#route-detail-map .maplibregl-canvas` が出る（WebGL がないと出ないので、出なくても失敗にしない形にするなら `canvas` の有無ではなく `maplibregl-map` クラスの付与で判定）
- [ ] **Step 6: E2E 実行** `npm run test:e2e -- route-detail` → PASS
- [ ] **Step 7: 開発サーバーで目視**：`npm run build` 後 `npx vite preview` で `/route/10101/` を開き、地図に線と 3 港が出ることをスクリーンショットで確認（本番データ取得には CORS 制約があるため、preview で線が出ない場合はモックと同じく dev プロキシで確認して結果を報告）
- [ ] **Step 8: コミット** `feat: 航路詳細ページに埋め込み地図を追加`

---

### Task 6: 一覧・JSON-LD・llms のリンクを詳細ページへ切り替える

**Files:**
- Modify: `src/presentation/routeList/RouteListPage.tsx`（航路名リンク → `buildRouteDetailPath(row.routeId)`、`ROUTE_LIST_INTRO` の 2 文目を「航路名を選ぶと、航路の詳細ページで地図・運航頻度・時刻表（運航事業者の公式サイト）へのリンクを確認できます。」）
- Modify: `routeList.html`（description・og・twitter の「航路名から地図を開くと、航路の詳細と時刻表…」を「航路名から詳細ページを開くと、地図・運航頻度・時刻表…」に。title は変えない）
- Modify: `src/application/routeListPublication.ts`（ItemList の url と llms-full の URL を `SITE_URL + buildRouteDetailPath`。`buildLlmsFullText(tables, siteUrl, generatedAt, routePages: RoutePageRecord[] = [])` で該当航路があれば `［発着港: A・B］［運航頻度: X］` を追記）
- Modify: `src/entrypoints/prerender.tsx` と `vite.config.ts`（llms-full に routePages を渡す。一覧の全 routeId が routePages にあるか検査し、欠けていれば欠けた routeId を列挙して throw。routePages か一覧のどちらかが空なら検査しない）
- Modify: `public/llms.txt`（主要ページに「航路詳細（例: https://searoute.info/route/10101/）: 航路ごとの事業者・発着港・運航頻度・船名・公式サイト・地図」を追記）
- Test: `tests/presentation/routeList/routeListView.test.tsx`（既存の href 期待値を `/route/2/` に更新）、`tests/application/routeListPublication.test.ts`、`tests/presentation/seoMetadata.test.ts`（キーワード検査が通ること）、`tests/entrypoints/prerender.test.tsx`（不整合で throw）、`tests/e2e/route-list.spec.ts` 等で旧 href を期待している箇所

- [ ] **Step 1: テストを先に更新・追加**（href 期待値の変更、llms-full の追記形式、不整合検査）
- [ ] **Step 2: 失敗を確認** `npm test` → 該当テスト FAIL
- [ ] **Step 3: 実装**
- [ ] **Step 4: 成功を確認** `npm test`・typecheck・lint・`npm run test:e2e` PASS
- [ ] **Step 5: コミット** `feat: 一覧・構造化データ・llms-full.txt のリンク先を航路詳細ページにする`

---

### Task 7: 仕様書の更新と仕上げ

**Files:**
- Modify: `docs/searoute-spec.md`（画面一覧に航路詳細ページ、ビルドのプリレンダーに詳細ページ生成、データに `routePages.json`、環境変数 `SEAROUTE_ROUTE_PAGES_FILE`）
- Modify: `README.md`（ビルド手順に詳細ページ生成を一行）

- [ ] **Step 1: ドキュメント更新**
- [ ] **Step 2: 全体確認** `npm run typecheck && npm run lint && npm test && npm run test:e2e` すべて PASS
- [ ] **Step 3: コミット** `docs: 航路詳細ページを仕様書に反映`
- [ ] **Step 4: モック削除** リポジトリ直下の `mock-route-detail.html`（未追跡）を削除
