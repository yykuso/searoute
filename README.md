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
- **スタイリング**: Tailwind CSS
- **フレームワーク**: Vanilla JavaScript (フレームワークレス)
- **ホスティング**: GitHub Pages

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
│   ├── common.js
│   ├── dataLoader.js
│   ├── geoJsonLayers.js
│   ├── rasterLayers.js
│   └── ...
├── data/                   # 航路・港湾データ（GeoJSON）
│   ├── seaRoute.geojson
│   ├── seaRouteDetails.json
│   ├── portData.geojson
│   └── ...
└── img/                    # 画像・アイコン
```

## ライセンス

MIT License

Copyright (c) 2026 [@yy_kuso](https://x.com/yy_kuso)

このソフトウェアは、著作権表示および本許諾表示を含む場合に限り、改変・再配布が可能です。

## 作者

[@yy_kuso](https://x.com/yy_kuso)