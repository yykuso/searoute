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
- **航路データ配信**: PMTiles（`https://pmtiles.searoute.info/`）
- **スタイリング**: Tailwind CSS（ビルド済み静的CSS）
- **フレームワーク**: Vanilla JavaScript (フレームワークレス)
- **ホスティング**: GitHub Pages

## セットアップ & 開発

### インストール

```bash
# 依存パッケージのインストール
npm install
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
├── css/                    # スタイルシート
├── js/                     # JavaScriptモジュール
│   ├── common.js               # マップ初期化・ベースマップ切替・レイヤー管理（メイン）
│   ├── dataLoader.js           # GeoJSON・詳細JSONの非同期読み込み
│   ├── pmtilesLayers.js        # PMTiles航路レイヤー追加・フィルタ・ズーム
│   ├── geoJsonLayers.js        # 港湾GeoJSONレイヤー・URLシェア復元
│   ├── rasterLayers.js         # 衛星画像などラスタータイルレイヤー管理
│   ├── layerConfig.js          # レイヤーメタデータ定義
│   ├── layersControl.js        # レイヤー表示切替パネルUI
│   ├── routeFilterControl.js   # 航路フィルタコントロール
│   ├── detailDrawer.js         # 詳細情報パネル制御
│   ├── hamburgerControl.js     # ハンバーガーメニューUI
│   ├── contextMenu.js          # 地図右クリックコンテキストメニュー
│   ├── cookieControl.js        # ユーザー設定のCookie永続化
│   ├── routeList.js            # 航路一覧ページのテーブル・検索
│   └── utils/
│       ├── drawerHelpers.js        # ドロワーHTML生成ヘルパー
│       ├── shareDrawer.js          # ドロワー状態のURLシェア機能
│       ├── outsideClickHandler.js  # 要素外クリック検出ユーティリティ
│       └── wikipediaImage.js       # Wikipedia APIによる船画像取得
├── data/                   # 港湾データ（GeoJSON）
│   ├── portData.geojson
│   └── ...
└── img/                    # 画像・アイコン
```

## 仕様書

- [docs/searoute-spec.md](docs/searoute-spec.md): 機能仕様、状態管理、回帰テスト観点をまとめた設計書

## ライセンス

MIT License

Copyright (c) 2026 [@yy_kuso](https://x.com/yy_kuso)

このソフトウェアは、著作権表示および本許諾表示を含む場合に限り、改変・再配布が可能です。

## 作者

[@yy_kuso](https://x.com/yy_kuso)