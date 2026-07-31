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

- **地図ライブラリ**: MapLibre GL JS
- **航路データ配信**: PMTiles + lightweight JSON（`https://pmtiles.searoute.info/`）
- **スタイリング**: Tailwind CSS 4（ビルド済み静的CSS）
- **フレームワーク**: Vanilla JavaScript (フレームワークレス)
- **テスト**: Vitest / Playwright
- **ホスティング**: Cloudflare Pages / 静的ホスティング

## セットアップ & 開発

### インストール

```bash
# 依存パッケージのインストール
npm install
```

### ローカル確認

静的サイトとして動作するため、任意のローカルサーバーで確認できます。

```bash
# 例: ルートディレクトリを配信
npx http-server .
```

### Tailwind CSS のビルド

本プロジェクトは Tailwind CSS を静的ビルド済みで運用しています。HTMLやJSファイルのクラスを変更した場合は、以下を実行してください：

```bash
# 一回のビルド
npm run build:css

# 開発中（自動再ビルド）
npm run watch:css
```

ビルドされたCSSは `css/tailwind.css` に出力されます。

### テスト

```bash
# 単体テスト
npm test

# E2E テスト
npm run test:e2e
```

## データソース

- **航路データ**: 独自に収集・作成
- **港湾データ**: [国土数値情報（港湾データ）](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C02-v3_2.html)を加工して作成
- **地図タイル**: OpenStreetMap、国土地理院、Esri

## プロジェクト構成

```
searoute/
├── index.html              # メインページ
├── routeList.html          # 航路一覧ページ
├── manifest.json           # PWAマニフェスト
├── service-worker.js       # Service Worker
├── css/                    # ビルド済みCSSと共通スタイル
├── data/                   # 港湾データなどの静的データ
├── docs/                   # 仕様書・補助ドキュメント
├── img/                    # 画像・アイコン
├── js/
│   ├── entrypoints/        # Composition Root
│   │   ├── mapPage.js
│   │   └── routeListPage.js
│   ├── application/        # 初期化・共有URL復元などのユースケース
│   ├── adapters/           # MapLibre, データ取得, Cookie, Analytics 連携
│   ├── presentation/       # UI描画とイベント接続
│   ├── domain/             # 純粋なドメインロジック
│   └── config/             # レイヤー定義・地図スタイル設定
├── style/                  # MapLibre スタイルJSON・スプライト定義
└── tests/                  # Vitest / Playwright テスト
```

### 主要ファイル

- `js/entrypoints/mapPage.js`: マップ画面のエントリーポイント
- `js/application/initializeMap.js`: MapLibre 初期化、コントロール追加、共有URL復元
- `js/adapters/map/pmtilesLayerAdapter.js`: PMTiles 航路レイヤーの描画、ズーム、ハイライト
- `js/presentation/map/`: ドロワー、レイヤー切替、コンテキストメニューなどの UI
- `js/presentation/routeList/`: 航路一覧の表示と検索
- `js/domain/`: フィルター、共有URL、航路データ整形などの純粋ロジック

## 仕様書

- [docs/searoute-spec.md](docs/searoute-spec.md): 機能仕様、状態管理、回帰テスト観点をまとめた設計書

## ライセンス

MIT License

Copyright (c) 2026 [@yy_kuso](https://x.com/yy_kuso)

このソフトウェアは、著作権表示および本許諾表示を含む場合に限り、改変・再配布が可能です。

## 作者

[@yy_kuso](https://x.com/yy_kuso)