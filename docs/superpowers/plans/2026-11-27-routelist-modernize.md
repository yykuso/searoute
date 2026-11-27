# 航路一覧画面のモダナイズ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 航路一覧（routeList.html）を Tailwind 化し、PC は整った表、スマホは CSS だけのカード表示、検索は入力即時の絞り込みにする。

**Architecture:** DOM は 1 つの `<table>` のまま（静的 HTML・ハイドレーションを維持）。見た目は Tailwind のユーティリティクラスと `src/styles/tailwind.css` に足す少量のカード用 CSS で作る。検索ロジックは既存 ViewModel の `search` / `reset` を使い、UI だけ変える。

**Tech Stack:** React 19 + TypeScript strict、Vite 8、Tailwind CSS 4（@tailwindcss/vite）、Vitest + Testing Library（jsdom）、Playwright

**Spec:** docs/superpowers/specs/2026-11-27-routelist-modernize-design.md

## Global Constraints

- 残す class / id / 文言：`sea-route-table` / `international-sea-route-table` / `sea-route-KR-table`、`season-row` / `suspend-row`、`route-id` / `business-name` / `route-name` / `info` / `information` / `ship-name` / `url`、`#searchbox`、placeholder「検索キーワードを入力」、`#search-message`、`route-search-highlight`、`.route-list-intro`、`.feedback-callout`、h1「フェリー・旅客船 航路一覧」、h2「国内航路」「国際航路」「韓国 国内航路」
- `RouteListViewModel` の API は変えない
- 表とカードの二重描画をしない。サーバー描画と初回クライアント描画を一致させる（ハイドレーションエラーを出さない）
- スマホ判定のブレークポイントは 640px（Tailwind の `sm`）
- vitest は PowerShell（cwd が大文字 `C:\`）から実行する。Git Bash の小文字 `c:\` では全件失敗する
- コミットメッセージは日本語。`Co-Authored-By` 行は付けない

## Review Focus

- 日本語入力の変換中に絞り込みが走ると、未確定文字でヒット 0 件になり表が一瞬消える → 変換中は `search` を呼ばない（Task 1 のテストで固定）
- データが無い表（開発サーバーで未取得・取得失敗）でチップや件数が「0」と出る → データのある表だけチップを出す（Task 2 のテスト）
- 検索語にスペースだけ・正規表現の記号（`[`, `(`）→ 今と同じ部分一致で落ちない（Task 1 のテストに `[Route]` を含める）
- JS 読み込み前の静的 HTML でもカード表示・表表示が崩れない（CSS だけで成立させる。Task 3 の E2E でスマホ幅の横スクロール無しを確認）
- 固定ヘッダー・検索バー・h2・thead の重なりで見出しが隠れる → 高さを CSS 変数 1 か所で管理（Task 3、目視確認項目）

---

### Task 1: 検索を入力即時の絞り込みにする

**Files:**
- Modify: `src/presentation/routeList/RouteListPage.tsx`
- Modify: `tests/presentation/routeList/routeListView.test.tsx`
- Modify: `tests/e2e/route-list.spec.ts`
- Modify: `tests/e2e/prerender.spec.ts:46`（「検索」ボタンの存在確認を `#searchbox` の存在確認に置き換え）
- Modify: `docs/searoute-spec.md`（7.14 LIST-02）

**Interfaces:**
- Consumes: `viewModel.search(query: string)`, `viewModel.reset()`, `matchesRouteSearchText`
- Produces: `countVisibleRows(state: RouteListState): number`（RouteListPage.tsx 内で export。`hasVisibleRow` を置き換え、検索語が空なら全行数、あれば一致行数を返す）。Task 2 が件数表示に使う

- [ ] **Step 1: 単体テストを書き換える（失敗させる）**

既存の「検索」「リセット」ボタンのクリックを削除し、次を追加・置換する：

```tsx
it('入力するたびに絞り込み、件数を表示する', async () => {
    await renderPage({ domestic: [{ routeId: '1', routeName: 'Ocean Route' }, { routeId: '2', routeName: 'Island Line' }] });
    fireEvent.change(screen.getByPlaceholderText('検索キーワードを入力'), { target: { value: 'ocean' } });
    const [matchRow, noMatchRow] = domesticRows();
    expect(matchRow.style.display).toBe('');
    expect(noMatchRow.style.display).toBe('none');
    expect(screen.getByText('1件')).toBeTruthy();
});

it('日本語入力の変換中は絞り込まず、確定時に絞り込む', async () => {
    await renderPage({ domestic: [{ routeId: '1', routeName: '大阪航路' }, { routeId: '2', routeName: '別府航路' }] });
    const box = screen.getByPlaceholderText('検索キーワードを入力');
    fireEvent.compositionStart(box);
    fireEvent.change(box, { target: { value: 'おおさか' } });
    expect(domesticRows().every((row) => row.style.display === '')).toBe(true);
    fireEvent.change(box, { target: { value: '大阪' } });
    fireEvent.compositionEnd(box);
    expect(domesticRows()[1].style.display).toBe('none');
});

it('✕で検索語・ハイライト・非表示行を元に戻す', async () => {
    // 既存のリセットテストを置換：'zzz' 入力 → getByRole('button', { name: '検索語を消去' }) をクリック
    // 期待値は既存どおり（searchBox.value === ''、全行 display === ''、ハイライト無し）
});

it('検索語が空のとき✕ボタンを出さない', async () => {
    await renderPage({ domestic: [{ routeId: '1', routeName: 'Ocean Route' }] });
    expect(screen.queryByRole('button', { name: '検索語を消去' })).toBeNull();
});

it('Enterでフォーム送信しない', async () => {
    // searchbox を含む form の submit イベントで defaultPrevented === true
});
```

ハイライト・「見つかりませんでした。」・HTML 風文字列のテストはボタンクリックを消すだけで期待値は変えない。

- [ ] **Step 2: 失敗を確認**

Run（PowerShell）: `npx vitest run tests/presentation/routeList/routeListView.test.tsx`
Expected: FAIL（件数・✕ボタンが無い、変換中に絞り込まれる 等）

- [ ] **Step 3: 実装**

- 検索欄を `<form role="search" onSubmit={(e) => e.preventDefault()}>` で包む
- `onChange`：`setSearchText(value)`。`composingRef.current` が false のときだけ `viewModel.search(value)`
- `onCompositionStart` で `composingRef.current = true`、`onCompositionEnd` で false にして `viewModel.search(event.currentTarget.value)`
- 検索語があるときだけ `<button type="button" aria-label="検索語を消去">✕</button>` を出し、`viewModel.reset()`
- `state.query` があるとき `<p aria-live="polite">{count}件</p>`（0 件なら件数は出さず `#search-message` に「見つかりませんでした。」）
- 「検索」「リセット」ボタンを削除。`input` は `type="search"` にしてよい（`#searchbox` と placeholder は維持）

- [ ] **Step 4: 単体テスト通過を確認**

Run: `npx vitest run tests/presentation/routeList/routeListView.test.tsx`
Expected: PASS

- [ ] **Step 5: E2E を更新**

`route-list.spec.ts`：`fill('[Route]')` の後のボタンクリックを削除。リセットは `getByRole('button', { name: '検索語を消去' }).click()`。`prerender.spec.ts:46` は `await expect(page.locator('#searchbox')).toBeVisible();` に置換。

- [ ] **Step 6: 仕様書 LIST-02 を更新**（入力即時・変換中は待つ・件数表示・✕で消去・ボタン廃止）

- [ ] **Step 7: 全体確認**

Run: `npm run typecheck; npm run lint; npm test; npx playwright test tests/e2e/route-list.spec.ts tests/e2e/prerender.spec.ts`
Expected: すべて PASS

- [ ] **Step 8: コミット** `feat: 航路一覧の検索を入力即時の絞り込みにする`

---

### Task 2: 表へのジャンプチップと凡例を追加する

**Files:**
- Modify: `src/presentation/routeList/RouteListPage.tsx`
- Modify: `tests/presentation/routeList/routeListView.test.tsx`
- Modify: `docs/searoute-spec.md`（7.13 LIST-01）

**Interfaces:**
- Consumes: `TABLES`（各要素に `anchorId` と `shortLabel` を追加：`domestic`/「国内」、`international`/「国際」、`korea`/「韓国」）、Task 1 の検索バー
- Produces: 各 h2 に `id={anchorId}`。Task 3 がスタイルを付ける `nav[aria-label="航路の種類"]` と凡例 `.route-legend`

- [ ] **Step 1: 失敗するテスト**

```tsx
it('データのある表だけジャンプ用チップを件数付きで出す', async () => {
    await renderPage({ domestic: [{ routeId: '1', routeName: 'A' }, { routeId: '2', routeName: 'B' }] });
    const nav = screen.getByRole('navigation', { name: '航路の種類' });
    const link = within(nav).getByRole('link', { name: /国内/ });
    expect(link.getAttribute('href')).toBe('#domestic');
    expect(link.textContent).toContain('2');
    expect(within(nav).queryByRole('link', { name: /国際/ })).toBeNull();
    expect(document.getElementById('domestic')?.tagName).toBe('H2');
});

it('季節運航・運休の凡例を1か所に出す', async () => {
    await renderPage({ domestic: [{ routeId: '1', routeName: 'A' }] });
    const legend = document.querySelectorAll('.route-legend');
    expect(legend).toHaveLength(1);
    expect(legend[0].textContent).toContain('季節運航');
    expect(legend[0].textContent).toContain('運休');
});
```

データが 1 件も無いときは nav 自体を出さない（`queryByRole('navigation', …)` が null）テストも追加。

- [ ] **Step 2: 失敗を確認** `npx vitest run tests/presentation/routeList/routeListView.test.tsx` → FAIL
- [ ] **Step 3: 実装**（チップ数は検索に関係なく各表の全行数。凡例は nav の直後）
- [ ] **Step 4: 通過を確認** → PASS
- [ ] **Step 5: 仕様書 LIST-01 に追記**（ジャンプ用チップ・凡例）
- [ ] **Step 6: 全体確認** `npm run typecheck; npm run lint; npm test` → PASS
- [ ] **Step 7: コミット** `feat: 航路一覧に表へのジャンプと凡例を追加する`

---

### Task 3: Tailwind へ移行し、PC は表・スマホはカードにする

**Files:**
- Modify: `src/entrypoints/main-routeList.tsx`（`import '../styles/tailwind.css';`）
- Modify: `routeList.html:36-37`（route-list.css の 2 行を `<!-- searoute:entry-css（ビルド時に Tailwind の CSS をここへ非同期読み込みで配置） -->` に置換）
- Delete: `public/css/route-list.css`
- Modify: `src/styles/tailwind.css`（カード表示など、ユーティリティで書けない分だけ `@layer components` に追記）
- Modify: `src/presentation/routeList/RouteListPage.tsx`
- Modify: `tests/presentation/routeList/routeListView.test.tsx`
- Create: `tests/e2e/route-list-responsive.spec.ts`
- Modify: `docs/searoute-spec.md`（150 行目のスタイル記述、LIST-01 の表示）

**Interfaces:**
- Consumes: Task 1・2 の DOM（検索 form、nav、`.route-legend`、h2 の id）
- Produces: 各 `<td>` に `data-label`（`HEADER_COLUMNS` の label：航路ID・事業者名・航路名・情報・船名・時刻表）と `data-column`（RouteColumn 名）。値が「-」の td に `data-empty="true"`

- [ ] **Step 1: 失敗する単体テスト**

```tsx
it('セルに列名のラベルを付け、空セルに印を付ける', async () => {
    await renderPage({ domestic: [{ routeId: '2', businessName: 'A', routeName: 'Route A', url: '' }] });
    const cells = domesticRows()[0].querySelectorAll('td');
    expect(cells[1].dataset.label).toBe('事業者名');
    expect(cells[2].dataset.column).toBe('routeName');
});

it('ヘッダーの「航路一覧」を現在地にする', async () => {
    await renderPage({});
    expect(screen.getByRole('link', { name: '航路一覧' }).getAttribute('aria-current')).toBe('page');
});
```

空セル（`'-'`）の `data-empty="true"` は、値が「-」になる行を用意して確認する（可視列判定で列ごと消えないよう、同じ表に値のある行を並べる）。

- [ ] **Step 2: 失敗を確認** → FAIL
- [ ] **Step 3: 実装**

- ヘッダー：全幅・sticky top-0、サイト名と nav（`aria-current="page"`）。背景は sky-200 付近（現行 #bfd9f2 に近い色）
- 本文は `max-w-[1200px] mx-auto px-3`
- 固定要素の高さは `:root` 相当の CSS 変数（例 `--rl-header-h`, `--rl-search-h`, `--rl-h2-h`）で一元管理し、検索バー・h2・thead の `top` を `calc()` で積む
- PC：表は全幅・角丸の枠・縞（`tbody tr:nth-child(even)`）・ホバー強調。`season-row` / `suspend-row` は背景色（#fffacd / #f8d7da 相当）＋左端 4px の色帯
- スマホ（`max-width: 639.98px`）：`table, tbody, tr, td` を block、`thead` は sr-only 相当。各 `tr` をカード（枠・角丸・余白）。`td[data-column="routeName"]` を大きく太字・先頭、`td[data-label]::before { content: attr(data-label) }` で項目名、`td[data-column="routeName"]::before` は出さない、`td[data-empty="true"]` は非表示、`td[data-column="url"] a` はボタン風、`td[data-column="routeId"]` は小さく右寄せ
- 検索時の非表示は今のインライン `display: none` のまま（カード化 CSS が上書きしないよう、CSS 側で `tr` に `display` を `!important` で指定しない）
- `highlightText` のインライン背景色は Tailwind クラス（`bg-yellow-200` 等）に置き換え、`route-search-highlight` class は維持

- [ ] **Step 4: 単体テスト通過を確認** → PASS

- [ ] **Step 5: E2E（スマホ幅）を追加**

`tests/e2e/route-list-responsive.spec.ts`：`route-list.spec.ts` と同じ `page.route` モックを使い、

```ts
test('スマホ幅では横スクロールせず行をカードで表示する', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/routeList.html');
    const row = page.locator('.sea-route-table tbody tr').first();
    await expect(row).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await expect(page.locator('.sea-route-table thead')).toHaveCSS('position', 'absolute'); // sr-only
    await expect(row).toHaveCSS('display', 'block');
});

test('PC幅では表として表示する', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/routeList.html');
    await expect(page.locator('.sea-route-table tbody tr').first()).toHaveCSS('display', 'table-row');
});
```

- [ ] **Step 6: ビルド成果物を確認**

Run: `$env:SEAROUTE_SKIP_ROUTE_DATA='1'; npm run build`
Expected: 成功。`dist/routeList.html` に `media="print" onload="this.media='all'"` 付きの `/assets/*.css` リンクがあり、`route-list.css` の参照が無い。`dist/css/route-list.css` が無い

- [ ] **Step 7: 仕様書を更新**（150 行目を「Tailwind CSS 4 と独自 CSS（public/css/。航路一覧は Tailwind のみ）」に、LIST-01 にスマホはカード表示を追記）

- [ ] **Step 8: 全体確認**

Run: `npm run typecheck; npm run lint; npm test; npm run test:e2e`
Expected: すべて PASS

- [ ] **Step 9: 目視確認**：`npx vite preview` で 375px / 1280px のスクリーンショットを撮り、固定要素の重なり・カードの並びを確認（Playwright の `page.screenshot` で可。成果物はスクラッチパッドへ）

- [ ] **Step 10: コミット** `feat: 航路一覧をTailwind化しスマホではカード表示にする`
