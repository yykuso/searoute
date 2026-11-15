# 航路一覧ビルド時埋め込み Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `routeList.html` の静的 HTML に全航路を含め、`llms-full.txt`・ItemList JSON-LD・404 ページを追加し、R2 更新時に自動再ビルドする。

**Architecture:** 既存の SSG（`vite.config.ts` の `searoute-prerender` → `src/entrypoints/prerender.tsx`）で、ビルド時に公開 lightweight JSON を取得して `RouteListPage` を描画する。同じデータを `<script type="application/json">` で HTML に埋め込み、クライアントはそれを初期状態にしてハイドレーション（fetch しない）。埋め込みが無いとき（開発サーバー・E2E）は従来どおり fetch。

**Tech Stack:** React 19 / Vite 8 / TypeScript strict / Vitest / Playwright / Cloudflare Pages / GitHub Actions

**Spec:** `docs/superpowers/specs/2026-11-15-routelist-prerender-design.md`

## Global Constraints

- レイヤー依存は内向きのみ（domain ← application ← adapters / presentation ← entrypoints）。`npm run lint` が通ること。
- テストは `C:\` 大文字ドライブから `npm test` を実行する（小文字だと全テスト失敗）。
- データ URL は既存 `ROUTE_LIST_TABLE_CONFIGS`（`src/entrypoints/routeListServices.ts`）の 3 件。
- サイトの絶対 URL は `https://searoute.info`。
- ビルド時のデータ取得が 1 件でも失敗したらビルドを失敗させる。
- 環境変数 `SEAROUTE_SKIP_ROUTE_DATA=1` のときはデータ取得・埋め込み・llms-full.txt 生成をスキップ（E2E 用。クライアントは従来どおり fetch）。
- `404.html` は sitemap に含めない。

## Review Focus

- ハイドレーション不一致: サーバー描画とクライアント初回描画の地図リンク href が一致すること（ホストに依存しない相対 URL にする）→ Task 1 のテスト。
- 埋め込み JSON に `</script>` を含む航路名があっても HTML が壊れないこと → Task 2 のテスト。
- 埋め込み JSON が壊れている／存在しないときは fetch にフォールバックすること → Task 2 のテスト。
- R2 更新直後の再ビルドで CDN キャッシュの古い JSON を読まないこと → Task 3 で取得 URL にキャッシュバスター `?v=<Date.now()>` を付ける。
- 3 テーブルのうち 1 件だけ失敗した場合もビルドが失敗すること → Task 3 のテスト。

---

### Task 1: 地図リンクを相対 URL の domain 関数にする

**Files:**
- Modify: `src/domain/route.ts`（関数追加）
- Modify: `src/presentation/routeList/RouteListPage.tsx`（`buildRouteMapUrl` と `locationRef` を削除し domain 関数を使う）
- Test: `tests/domain/route.test.ts`, `tests/presentation/routeList/routeListView.test.tsx`

**Interfaces:**
- Produces: `buildRouteMapPath(routeId: string, sourceId: string): string` — 戻り値 `index.html?share=route&routeId=<id>&sourceId=<sourceId>`（`URLSearchParams` でエンコード）

- [ ] **Step 1: 失敗するテストを書く**（`tests/domain/route.test.ts`）

```ts
it('buildRouteMapPath は相対の共有URLを返す', () => {
    expect(buildRouteMapPath('2', 'geojson_sea_route')).toBe('index.html?share=route&routeId=2&sourceId=geojson_sea_route');
});
```

`routeListView.test.tsx` の `describe('buildRouteMapUrl')` を削除し、`locationRef` を渡さずに描画した行のリンク `href` が `index.html?share=route&routeId=2&sourceId=geojson_sea_route` であることを確認するテストに置き換える。

- [ ] **Step 2: `npm test -- tests/domain/route.test.ts tests/presentation/routeList` → FAIL**
- [ ] **Step 3: 実装**（`RouteListPage` の `locationRef` prop と関連引数をすべて削除）
- [ ] **Step 4: `npm test` と `npm run lint` → PASS**（`tests/e2e/route-list.spec.ts` の href 検査は正規表現なのでそのまま通る想定）
- [ ] **Step 5: Commit** `航路一覧の地図リンクを相対URLにする`

### Task 2: 埋め込みデータの直列化と ViewModel の初期状態

**Files:**
- Create: `src/application/routeListSnapshot.ts`
- Modify: `src/application/viewModels/routeListViewModel.ts`
- Modify: `src/entrypoints/routeListServices.ts`, `src/entrypoints/routeListApp.tsx`
- Test: `tests/application/routeListSnapshot.test.ts`, `tests/application/viewModels/routeListViewModel.test.ts`

**Interfaces:**
- Produces:
  - `ROUTE_LIST_SNAPSHOT_ID = 'route-list-data'`
  - `serializeRouteListSnapshot(tables: RouteTableState[]): string` — `<script type="application/json" id="route-list-data">…</script>` を返す。JSON 中の `<` は `\u003c` にエスケープ。
  - `parseRouteListSnapshot(text: string | null | undefined): RouteTableState[] | null` — 空・不正 JSON・配列でない場合は `null`。
  - `RouteListViewModelOptions.initialTables?: RouteTableState[]` — 指定時は `status: 'ready'`, `tables: initialTables` で開始。
  - `createRouteListServices({ initialTables }?: { initialTables?: RouteTableState[] })`

- [ ] **Step 1: 失敗するテストを書く**
  - `serialize` → 正規表現で中身を取り出して `parse` すると元の配列と一致（往復）。
  - `routeName: '</script><b>x'` を含めても出力に `</script>` が 1 回しか現れない。
  - `parse('')`, `parse('{')`, `parse('{"a":1}')` はいずれも `null`。
  - ViewModel: `initialTables` を渡すと `getState()` が `{ status: 'ready', tables: initialTables }` を含み、`repository.loadRouteRows` は呼ばれない。
- [ ] **Step 2: `npm test -- tests/application` → FAIL**
- [ ] **Step 3: 実装**。`routeListApp.tsx` は `parseRouteListSnapshot(document.getElementById(ROUTE_LIST_SNAPSHOT_ID)?.textContent)` を読み、結果があれば `initialTables` で作って `initialize()` を呼ばない。無ければ従来どおり `initialize()`。
- [ ] **Step 4: `npm test` と `npm run lint` → PASS**
- [ ] **Step 5: Commit** `航路一覧の埋め込みデータから初期表示できるようにする`

### Task 3: ビルド時取得と出力（HTML 埋め込み・JSON-LD・llms-full.txt）

**Files:**
- Create: `src/application/useCases/loadRouteListTables.ts`
- Create: `src/application/routeListPublication.ts`（JSON-LD と llms-full の純関数）
- Modify: `src/entrypoints/prerender.tsx`, `vite.config.ts`, `playwright.config.ts`, `public/llms.txt`
- Test: `tests/application/useCases/loadRouteListTables.test.ts`, `tests/application/routeListPublication.test.ts`, `tests/entrypoints/prerender.test.tsx`

**Interfaces:**
- Consumes: Task 1 `buildRouteMapPath`、Task 2 `serializeRouteListSnapshot`、既存 `RouteTableConfig` / `RouteTableState` / `getVisibleRouteColumns`
- Produces:
  - `loadRouteListTables(configs: RouteTableConfig[], repository: RouteListRepository): Promise<RouteTableState[]>` — 1 件でも失敗したら reject（エラーメッセージに dataPath を含める）。
  - `ROUTE_TABLE_LABELS: Record<string, string>` = `{ geojson_sea_route: '国内航路', geojson_international_sea_route: '国際航路', geojson_KR_sea_route: '韓国国内航路' }`
  - `buildRouteListJsonLd(tables: RouteTableState[], siteUrl: string): string` — `<script type="application/ld+json">` で `@type: ItemList`、各 `ListItem` は `position` / `name`（`事業者 航路名`）/ `url`（`siteUrl + '/' + buildRouteMapPath(...)`）のみ。`<` はエスケープ。
  - `buildLlmsFullText(tables: RouteTableState[], siteUrl: string, generatedAt: string): string` — Markdown。`# おでかけ航路マップ 全航路一覧`、生成日時、カテゴリ見出し `## 国内航路` 等、各行 `- 事業者｜航路名（船名）: 地図URL / 公式: url`（無い項目は省略）。末尾に公式情報を優先する旨の注意書き（`public/llms.txt` の補足と同趣旨）。
  - `prerender.tsx`:
    - `export type PrerenderedPage = { app: string; head?: string; bodyEnd?: string }`
    - `renderPages(buildNumber: string, routeTables?: RouteTableState[]): Record<string, PrerenderedPage>` — `routeTables` が空なら routeList の `head`/`bodyEnd` は付けない。
    - `loadPrerenderRouteTables(): Promise<RouteTableState[]>` — `ROUTE_LIST_TABLE_CONFIGS` の各 `dataPath` に `?v=${Date.now()}` を付けて `createRouteListRepository()` で取得。

- [ ] **Step 1: 失敗するテストを書く**
  - `loadRouteListTables`: 3 件成功で 3 テーブル（`visibleColumns` は `getVisibleRouteColumns(rows)`）。2 件目だけ失敗するモックで reject し、メッセージに 2 件目の dataPath を含む。
  - `buildRouteListJsonLd`: 2 行入力で `itemListElement.length === 2`、1 件目の url が `https://searoute.info/index.html?share=route&routeId=2&sourceId=geojson_sea_route`。
  - `buildLlmsFullText`: `## 国内航路` を含み、url の無い行に `公式:` が出ない。
  - `prerender.test.tsx`: 既存テストは `renderPages(BUILD_NUMBER)[fileName].app` に変更（データ無しで旧版と同等のまま）。追加テストとして、1 行の `routeTables` を渡すと `app` に航路名、`bodyEnd` に `id="route-list-data"`、`head` に `ItemList` が含まれる。
- [ ] **Step 2: `npm test` → FAIL**
- [ ] **Step 3: 実装**
  - `prerender.tsx` で `renderRouteListPage(routeTables)` は `createRouteListViewModel({ tables: [], repository: 空, initialTables: routeTables })` で描画。
  - `vite.config.ts` の `closeBundle`: `process.env.SEAROUTE_SKIP_ROUTE_DATA === '1'` でなければ `loadPrerenderRouteTables()` を await（失敗はそのまま throw）。各ページで `app` を `<div id="app">` へ、`head` を `</head>` 直前へ、`bodyEnd` を `</body>` 直前へ挿入。データがあれば `dist/llms-full.txt` を書き出す。
  - `playwright.config.ts` の `webServer` に `env: { SEAROUTE_SKIP_ROUTE_DATA: '1' }`。
  - `public/llms.txt` の「主要ページ」に `- [全航路一覧（テキスト）](https://searoute.info/llms-full.txt): 掲載している全航路の事業者・航路名・地図リンク・公式サイトの一覧です。` を追加。
- [ ] **Step 4: 検証**
  - `npm test`・`npm run lint`・`npm run typecheck` → PASS
  - `npm run build` → `dist/routeList.html` に実データの航路名（例: `ハートランドフェリー`）が含まれ、`dist/llms-full.txt` が存在する。
  - `npm run preview` で `/routeList.html` を開き、コンソールにハイドレーションエラーが無く、Network に lightweight JSON の取得が無く、検索が動く。
  - `npm run test:e2e` → PASS
- [ ] **Step 5: README / `docs/searoute-spec.md` の該当箇所（ビルド・航路一覧）を更新し Commit** `航路一覧をビルド時のデータでプリレンダリングし llms-full.txt を生成する`

### Task 4: 404 ページと og:image 修正

**Files:**
- Create: `public/404.html`
- Modify: `routeList.html`（og:image / twitter:image 等の `/searoute/img/banner.png` → `/img/banner.png`）
- Modify: `.cloudflare/build.sh`（sitemap 生成で `404.html` を除外）
- Test: `tests/presentation/seoMetadata.test.ts`

**Interfaces:** なし

- [ ] **Step 1: 失敗するテストを書く**（`seoMetadata.test.ts`）
  - `routeList.html` と `index.html` の `og:image` が `https://searoute.info/img/banner.png`。
  - `public/404.html` が存在し、`<meta name="robots" content="noindex">` と `href="/"`・`href="/routeList.html"` のリンクを含み、`lang="ja"`。
- [ ] **Step 2: `npm test -- tests/presentation/seoMetadata.test.ts` → FAIL**
- [ ] **Step 3: 実装**。`404.html` は外部 CSS/JS に依存しない自己完結の静的ページ（インライン style、タイトル `ページが見つかりません | おでかけ航路マップ`）。`build.sh` の sitemap ループで `404.html` を `continue`。
- [ ] **Step 4: `npm test` → PASS。`npm run build` 後 `dist/404.html` があること。**
- [ ] **Step 5: Commit** `404ページを追加し航路一覧のog:imageのパスを修正する`

### Task 5: R2 更新後に Pages を再ビルド（searoute-pmtiles リポジトリ）

**Files:**
- Modify: `c:\MyPrograms\waiwai\searoute-pmtiles\.github\workflows\deploy-r2.yml`
- Modify: `c:\MyPrograms\waiwai\searoute-pmtiles\README.md`（Secret の説明）

- [ ] **Step 0: lightweight JSON を details 変更時にも再生成・アップロードする**（既存の不具合: `generate-lightweight-json.mjs` は details を結合するが、現状は geojson 変更時しか実行・アップロードされない）。`Generate lightweight JSON` の `if` を `geojson == 'true' || details == 'true'` にし、lightweight の `aws s3 sync` を PMTiles/GeoJSON のステップから分離して同じ条件で実行する。
- [ ] **Step 1: 末尾にステップ追加**: `name: Trigger Cloudflare Pages rebuild`、`if: steps.changes.outputs.geojson == 'true' || steps.changes.outputs.details == 'true'`、`env: CF_PAGES_DEPLOY_HOOK: ${{ secrets.CF_PAGES_DEPLOY_HOOK }}`、`run:` で Secret 未設定なら警告を出して終了、設定済みなら `curl -fsS -X POST "$CF_PAGES_DEPLOY_HOOK"`。
- [ ] **Step 2: README に「Cloudflare Pages の Deploy Hook（main ブランチ）を発行し Secret `CF_PAGES_DEPLOY_HOOK` に登録する」旨を追記。**
- [ ] **Step 3: YAML 構文確認**（`npx --yes yaml-lint` 等、または `node -e` で `yaml` パース）→ エラー無し
- [ ] **Step 4: Commit**（searoute-pmtiles 側）`R2更新後にCloudflare Pagesの再ビルドを起動する`
- 手作業（ユーザー）: Cloudflare ダッシュボードで Deploy Hook 発行 → GitHub Secret 登録。
