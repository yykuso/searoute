# 航路詳細ページ（静的）設計

## 目的と背景

AI 検索（ChatGPT 検索＝Bing インデックス、Google AI Overviews など）や通常の検索から、航路ごとの情報を拾われ・引用されるようにする。

現状、航路の詳細（運航頻度・船名・説明・公式サイト）は地図ドロワー内にしかなく、JavaScript 実行後に `pmtiles.searoute.info/details/...` を取得して初めて表示される。多くの AI クローラーは JS を実行しない。また一覧の JSON-LD・`llms-full.txt` のリンク先は `/?share=route&routeId=...` で、`index.html` の canonical が `/` 固定のため、すべてトップページと同一扱いになっている。

そこで航路ごとに独立した URL を持つ静的 HTML の詳細ページを、ビルド時に生成する。検索から人が着地することも想定し、人が読むページとして作り込む（ユーザー決定：案 A）。

## ゴール / 非ゴール / アンチゴール

- ゴール
  - 対象 3 レイヤーの全航路（約 580 件）に `/route/<routeId>` の静的ページがある
  - JS なしで本文（事業者・航路名・発着港・運航頻度・船名・車両航送・公式リンク）が読める
  - 航路線と発着港を表示する埋め込み地図がある
  - データ更新（searoute-pmtiles の push）で自動的にページも更新される（既存の Deploy Hook）
  - 一覧・JSON-LD・`llms-full.txt`・sitemap から詳細ページへたどれる
- 非ゴール
  - 港ごとのページ、事業者ごとのページ（将来検討）
  - 期間限定レイヤー（`seaRoute_limited`）の詳細ページ
  - 自前の差分ビルド機構（Cloudflare Pages のハッシュ単位アップロードで配信は差分になる）
  - 詳細 JSON への手入力の座標追加
- アンチゴール
  - 本文表示が MapLibre の読み込みを待って遅くなる
  - 中身の薄い重複ページの量産（情報のない航路も最低限、発着港・事業者・地図は出る）
  - geojson と座標を二重管理してずれる

## 方式の検討

| 案 | 内容 | 判断 |
|---|---|---|
| 1. 既存プリレンダーの拡張 | `vite.config.ts` の `prerenderPages` で React コンポーネントを SSR し `route/<id>/index.html` を出力 | **採用**。一覧と同じスタイル・部品を使え見た目がそろう |
| 2. build.sh で素の HTML を生成 | テンプレート文字列で HTML 出力 | デザインが React と二重管理になる |
| 3. Pages Functions で動的生成 | アクセス時にレンダリング | 新しい実行環境・キャッシュ設計が増える。Deploy Hook があり利点が小さい |

## 決定事項

### URL

- `/route/<routeId>`（例 `/route/10101`）。routeId は全レイヤーで一意（2026-11-27 時点 593 件、重複なし）。
- 出力は `route/<routeId>/index.html`。Cloudflare Pages の正規形は末尾スラッシュ付き `/route/10101/` になるため、canonical・内部リンク・sitemap はすべて `/route/10101/` に統一する（builder 判断事項：Pages の実挙動を確認して合わせる）。
- ビルド時に routeId の重複を検出したらビルドを失敗させる。
- 対象は `seaRoute`・`seaRoute_international`・`seaRoute_KR` の 3 レイヤー。`seaRoute_limited`（期間限定）は作らない（ユーザー決定）。集約 JSON にも含めない。

### データ（searoute-pmtiles 側）

`scripts/generate-lightweight-json.mjs` を拡張し、詳細ページ用の集約 JSON を追加出力する。

- 出力：`lightweight/routePages.json`（既存の lightweight と同じ R2 アップロード・Deploy Hook の流れに乗る）
- 内容（1 航路 1 レコード）
  - `routeId`, `layer`
  - 詳細 JSON の `businessName`, `routeName`, `url`, `info`, `freq`, `freqInfo`, `car`, `bike`, `bicycle`, `shipName`, `note`, `bbox`, `lastChecked`（あるものだけ）
  - `ports: [{ name, lon, lat }]`：geojson の各フィーチャーの始点を `portName1`、終点を `portName2` として取り出し、港名で重複を除いた配列（出現順）。座標は小数第 5 位に丸める
- 航路の線そのものは含めない（地図は既存の pmtiles を routeId で絞って描く）
- 既存の lightweight 各ファイルの形式は変えない

### サイト側のビルド

- `prerender.tsx` で `routePages.json` を 1 回取得（既存の一覧データ取得と同じタイムアウト・失敗時ビルド失敗の扱い。`SEAROUTE_SKIP_ROUTE_DATA=1` では取得せずページも出さない）
- 詳細ページ用の HTML テンプレート（`routeDetail.html`）を Vite の入力に追加し、そのビルド結果を雛形に各航路の HTML を書き出す。head（title・description・canonical・OGP・JSON-LD）は航路ごとに差し替える
- クライアント JS は地図部分だけ。本文は静的 HTML のまま（ハイドレーションは地図の島だけでよい。builder 判断）

### ページ構成（モックで合意済み）

1. 共通ヘッダー（一覧ページと同じ。マップ・航路一覧へのリンク）
2. パンくず：おでかけ航路マップ › 航路一覧 › 国内航路など › 航路名
3. 事業者名 → 航路名（h1） → バッジ（レイヤー種別・自動車・バイク・自転車。航送不可のものは出さない。季節運航・運休は `note` からバッジ表示）
4. 埋め込み地図（高さ PC 340px / スマホ 260px）
   - MapLibre を本文表示後に遅延読み込み。読み込み前は同じ高さの枠を確保してレイアウトずれを防ぐ
   - 表示範囲は `bbox`、線は pmtiles を `routeId` でフィルター、港は `ports` のラベル付きマーカー
   - `cooperativeGestures`（スマホは 2 本指操作）、ズームボタンあり
   - ベース地図スタイルはマップ画面と同じ `/style/maptiler-basic-ja-custom.json`
5. ボタン：「大きな地図で見る」（既存の `/?share=route&routeId=...&sourceId=...`）、「時刻表（公式サイト）」（`url` があるときのみ、外部リンク）
6. 航路の情報（定義リスト）：事業者／発着港（`ports` の港名を ⇄ でつなぐ）／運航頻度（`freqInfo`）／船名／車両航送／情報（`info`）／情報確認日（`lastChecked`）。値がない項目は行ごと出さない
7. 同じ事業者の航路（`businessName` 一致、自分以外。なければセクションごと出さない）
8. 注意書き（航路線は目安、最新情報は公式サイトで）

港名への島名などの補足はデータにないので出さない。

### メタ情報・構造化データ

- title：`<事業者> <航路名> | おでかけ航路マップ`
- description：事業者・航路名・発着港・運航頻度・船名・車両航送から組み立てる
- canonical・og:url：詳細ページの URL。og:image は既存バナー
- JSON-LD：`BoatTrip`（`name`, `provider`=Organization（事業者名・公式 URL）, `departureBoatTerminal` / `arrivalBoatTerminal`=BoatTerminal（name・geo）。港が 3 つ以上なら先頭と末尾を発着、`subTrip` は使わない）＋ `BreadcrumbList`

### 既存出力の変更

- 一覧ページ：航路名のリンク先を詳細ページに変更（地図へは詳細ページから。ユーザー決定）
- 一覧の JSON-LD（ItemList）・`llms-full.txt` の URL を詳細ページに変更。`llms-full.txt` には発着港と運航頻度も追記
- `llms.txt` の主要ページに詳細ページの説明を追記
- sitemap：`build.sh` の既存処理が `deploy` 配下の HTML から自動生成するのでそのまま載る（`lastmod` を `lastChecked` にするのは builder 判断で可）

## 制約

- 航路データの配信元（pmtiles.searoute.info）は本番オリジンにしか CORS を許可していない。開発時は既存の `/__route-data` プロキシを使う
- MapLibre は `maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url` で worker URL を設定する必要がある（`mapFactory.ts` と同じ）
- ベースカラーは `#BFD9F2`（地図の海の色）を使う。近似色に変えない
- 作業順：searoute-pmtiles（集約 JSON）を先にマージ・R2 反映 → searoute（ページ生成）
- searoute-pmtiles の PR も `--merge`（squash しない）

## builder に任せること

- コンポーネント・ファイルの分割、テストの粒度
- 地図の遅延読み込みのきっかけ（即時 / IntersectionObserver）
- 末尾スラッシュの扱いの最終確認
- 「情報」（`info`）欄の表示位置の微調整
