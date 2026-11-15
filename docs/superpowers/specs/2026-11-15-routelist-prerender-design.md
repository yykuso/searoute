# 航路一覧のビルド時データ埋め込み（AI/クローラー向け）設計

## 目的・背景
- SEO順位は悪くないがアクセスが減っている。AI検索（AI Overview / ChatGPT / Perplexity 等）で回答が完結し、クリックされにくくなっていると推測。
- 現状 `routeList.html` はプリレンダリング済みだが空テーブルで、航路データはブラウザで R2（`pmtiles.searoute.info`）から取得している。JSを実行しない AI クローラーには航路情報が見えない。
- AI に引用される「中身のある HTML / テキスト」を `searoute.info` 上に置く。

## ゴール / 非ゴール / アンチゴール
- ゴール: `routeList.html` の HTML に全航路（国内・国際・韓国国内）が含まれる。`llms-full.txt` で全航路を Markdown 提供。R2 のデータ更新でサイトが自動再ビルドされる。
- 非ゴール: 航路ごとの個別ページ（将来、同じ仕組みで追加）。Pages Functions による動的生成。
- アンチゴール: 取得失敗で空の一覧が本番に出ること。ハイドレーション不一致によるエラーや一覧のちらつき。

## アプローチ
| 案 | 内容 | 判断 |
|---|---|---|
| A. ビルド時取得（採用） | ビルド中に公開 JSON を fetch して SSG に流し込む。R2 更新時は Deploy Hook で再ビルド | データ更新がほぼ無いため最適。運用コストゼロ |
| B. Pages Functions | リクエスト時に JSON を取得し HTMLRewriter で差し込み | 鮮度は高いが部品が増える。更新頻度が上がったら移行 |
| C. pmtiles 側で HTML 生成 | R2 に HTML/MD を置く | 別ドメインになり評価が searoute.info に付かないため不採用 |

将来 B へ移れるよう、「JSON → 表示データ」の変換は既存の `normalizeRouteRows`（domain）を使い回し、取得処理と分離する。

## 設計
1. **ビルド時取得**（`vite.config.ts` の `searoute-prerender` / `src/entrypoints/prerender.tsx`）
   - `ROUTE_LIST_TABLE_CONFIGS` の 3 URL を既存 `createRouteListRepository` で取得し、ViewModel を初期化した状態で `renderToString`。`renderPages` は async 化。
   - 取得失敗時はビルドを失敗させる（前回デプロイが残るため安全）。
2. **ハイドレーション整合**
   - 取得データを `<script type="application/json" id="route-list-data">` として HTML に埋め込む。
   - クライアントはこれを初期状態として ViewModel を作り、fetch はしない（埋め込みが無い開発サーバーでは従来どおり fetch）。
3. **llms-full.txt**: 同じデータから `dist/llms-full.txt` を生成（カテゴリ別に 事業者 / 航路名 / 地図リンク / 公式URL）。`llms.txt` からリンク。
4. **構造化データ**: `routeList.html` に `ItemList` の JSON-LD を追加（ビルド時生成）。
5. **自動再ビルド**: searoute-pmtiles の `deploy-r2.yml` 末尾に Cloudflare Pages Deploy Hook を叩くステップを追加（Secret `CF_PAGES_DEPLOY_HOOK`）。Hook URL の発行はユーザーが Cloudflare ダッシュボードで行う。
6. **ついでの修正**: `routeList.html` の `og:image` パス誤り（`/searoute/img/banner.png` → `/img/banner.png`）。
7. **404 ページ**: `public/404.html` を追加し、存在しない URL に HTTP 404 を返す（現状は Cloudflare Pages の SPA フォールバックで全 URL が 200 + index.html のソフト404）。地図・航路一覧へのリンクを置く簡素な静的ページ。`noindex`。Lighthouse の `ai-catalog.json` 監査エラー（HTML を JSON として読んで失敗）もこれで解消し、該当なしになる想定。
   - `ai-catalog.json` / `ard.json`（ARD）は、エージェントが呼び出せる資源（API・MCP 等）が無いため今回は作らない（非ゴール）。

## 実装者に任せる点
- `llms-full.txt` の細かな書式、JSON-LD に含める項目の範囲。
- テスト: prerender 結果に航路行が含まれること、埋め込みデータからの初期化、取得失敗でビルドが落ちること（fetch はモック）。
