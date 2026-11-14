# おでかけ航路マップ

日本全国の旅客船・フェリー航路情報を地図で探せるWebアプリケーションです。時刻表や公式サイトへのリンクも充実、旅行計画に便利です。

🌐 **デモサイト**: [https://searoute.info/](https://searoute.info/)

## 特徴

- 📍 **インタラクティブな地図表示**: 日本全国の航路を地図上で可視化
- 🚢 **豊富な航路情報**: 国内航路、国際航路、韓国航路を網羅
- 🔗 **時刻表リンク**: 各航路の時刻表や公式サイトへ直接アクセス
- 📱 **PWA対応**: スマートフォンでもアプリのように利用可能
- 🗺️ **複数の地図スタイル**: OpenStreetMap、衛星画像、国土地理院など

## 技術スタック

- **フレームワーク**: React 19 + TypeScript（strict）/ Vite 8（マルチページ: `index.html`, `routeList.html`）
- **地図ライブラリ**: MapLibre GL JS 6.18.0 / MapLibre Geocoder 1.9.4 / PMTiles 4.5.0（npm パッケージ）
- **航路データ配信**: PMTiles + lightweight JSON（`https://pmtiles.searoute.info/`）
- **スタイリング**: Tailwind CSS 4（`@tailwindcss/vite`）+ 静的CSS（`public/css/`）
- **テスト**: Vitest + React Testing Library / Playwright
- **静的解析**: ESLint + eslint-plugin-boundaries（レイヤー依存ルール）
- **ホスティング**: Cloudflare Pages（`.cloudflare/build.sh` → `deploy/`）

## セットアップ & 開発

```bash
npm install        # 依存パッケージのインストール
npm run dev        # 開発サーバー
npm run build      # 型チェック + 本番ビルド（dist/）
npm run preview    # ビルド成果物の確認
npm run typecheck  # 型チェックのみ
npm run lint       # ESLint（レイヤー境界チェックを含む）
npm test           # 単体テスト
npm run test:e2e   # E2E テスト（ビルド成果物に対して実行）
```

## データソース

- **航路データ**: 独自に収集・作成
- **港湾データ**: [国土数値情報（港湾データ）](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C02-v3_2.html)を加工して作成
- **地図タイル**: OpenStreetMap、国土地理院、Esri

## プロジェクト構成

```
searoute/
├── index.html / routeList.html  # Vite のエントリー HTML（head の SEO/OGP/解析設定を含む）
├── public/                      # そのまま配信する静的ファイル（data/ style/ img/ css/ manifest.json service-worker.js 等）
├── src/
│   ├── domain/          # 純粋なドメインロジックと型（外部依存なし）
│   ├── config/          # レイヤー定義・地図スタイル設定（純データ）
│   ├── application/     # ユースケース・ViewModel・ポート定義（DOM/MapLibre/React 非依存）
│   ├── adapters/        # ポートの実装（MapLibre, PMTiles, Cookie, fetch, Nominatim, Wikipedia, GA）
│   ├── presentation/    # React コンポーネント・フック（common/ map/ routeList/）。サービスは Context で注入され adapters を直接参照しない
│   ├── entrypoints/     # Composition Root（main-map.tsx / main-routeList.tsx で依存を組み立てて createRoot、Service Worker 登録）
│   └── styles/          # Tailwind 入力
├── sprite-src/          # スプライト元 SVG（配信対象外）
├── docs/                # 仕様書・補助ドキュメント
└── tests/               # Vitest / Playwright テスト（src と同じ層構成）
```

依存は内向きのみ（domain ← application ← adapters / presentation ← entrypoints）。`npm run lint` で検査します。

- ViewModel（application）はフレームワーク非依存。React は `useViewModelState`（useSyncExternalStore）で購読します。
- 地図ページの UI が必要とするサービスは `presentation/map/mapPageServices.tsx` の `MapPageServices` として定義し、`entrypoints/mapServices.ts` が adapters を組み合わせて実装、`MapServicesProvider` で注入します。
- MapLibre のコントロール（ハンバーガー・レイヤー・航路フィルター）は adapters の `ContainerControl` が空のコンテナを追加し、React がポータルで中身を描画します。
- ビルド時プリレンダリング（SSG）: `npm run build` の最後に `src/entrypoints/prerender.tsx` を SSR で描画し、`dist/*.html` の `#app` に静的 HTML（見出し・サイト情報・プライバシーポリシー・一覧の検索 UI 等）を埋め込みます。クライアントは `hydrateRoot` で引き継ぐため、コンポーネントは描画中に window / document / Cookie を参照しないでください（副作用内で参照する）。Cookie バナーの表示判定は index.html head のインラインスクリプトが `html[data-cookie-banner]` を付けて CSS で行います。

## 仕様書

- [docs/searoute-spec.md](docs/searoute-spec.md): 機能仕様、状態管理、回帰テスト観点をまとめた設計書

## ライセンス

MIT License

Copyright (c) 2026 [@yy_kuso](https://x.com/yy_kuso)

このソフトウェアは、著作権表示および本許諾表示を含む場合に限り、改変・再配布が可能です。

## 作者

[@yy_kuso](https://x.com/yy_kuso)