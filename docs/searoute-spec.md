# おでかけ航路マップ 仕様書

## 1. 文書の目的

この文書はおでかけ航路マップの現行仕様を Spec-Driven Development 風に整理し、機能改修時の影響確認と回帰テストの基準として利用する設計書である。

主な用途は以下の通り。

- 仕様の基準線を明文化する
- 改修時に確認すべき振る舞いを明確にする
- 画面、データ、状態管理、外部依存の関係を把握しやすくする
- 手動テスト観点を漏れにくくする

## 2. 対象範囲

対象は Cloudflare Pages 上で配信される静的 Web アプリケーション全体。

- マップ画面: index.html
- 航路一覧画面: routeList.html
- PWA 関連: public/manifest.json, public/service-worker.js
- データ表示ロジック: src 配下の React + TypeScript モジュール群
- 航路データ: `https://pmtiles.searoute.info/` から配信する PMTiles と JSON
- 港湾データ: public/data/portData.geojson
- AI・クローラー向け出力: public/llms.txt、ビルド時に生成する llms-full.txt、航路一覧の構造化データ、public/404.html

対象外。

- 航路データ作成ツールの詳細仕様
- データ入力ワークフロー
- サーバーサイド処理

## 3. システム概要

本サイトは日本国内外の旅客船・フェリー航路情報を地図上で探索できる静的 Web アプリである。利用者は地図上の航路や港湾をクリックして詳細情報を確認し、外部の時刻表や公式サイトへ遷移できる。

主要な利用シナリオは以下。

- 地図上で航路を探す
- 航路の事業者名、航路名、運行頻度、備考、船名を確認する
- 航路の公式サイトや時刻表を開く
- 港湾位置を地図上で確認する
- 一覧ページで航路を検索する
- スマートフォンで PWA として利用する

## 4. 画面構成

### 4.1 マップ画面

対象ファイル。

- index.html
- src/entrypoints/main-map.tsx / src/entrypoints/mapServices.ts
- src/presentation/map/MapPage.tsx（ルートコンポーネント）
- src/presentation/map/DetailDrawer.tsx / detailDrawerController.ts / DrawerBody.tsx
- src/presentation/map/HamburgerMenu.tsx / LayerControl.tsx / RouteFilterControl.tsx
- src/presentation/map/ContextMenu.tsx / mapPointerInteractions.ts / touchPanelToggle.ts
- src/presentation/common/（InfoWindow / PrivacyPolicyWindow / CookieBanner / toast / loadingIndicator）
- src/adapters/map/mapFactory.ts / controlContainer.ts / geoJsonLayerAdapter.ts / pmtilesLayerAdapter.ts / layerManager.ts
- src/config/layerConfig.ts

主要 UI 要素。

- MapLibre GL JS ベースの地図
- ベースマップ・オーバーレイ・データレイヤー切替 UI
- 詳細ドロワー
- 検索ボックス
- ハンバーガーメニュー
- コンテキストメニュー
- 設定ウィンドウ
- 情報ウィンドウ
- ローディング表示

### 4.2 航路一覧画面

対象ファイル。

- routeList.html
- src/entrypoints/main-routeList.tsx / src/entrypoints/routeListServices.ts
- src/presentation/routeList/RouteListPage.tsx
- src/application/viewModels/routeListViewModel.ts
- src/adapters/data/routeListRepository.ts
- src/application/routeListSnapshot.ts（埋め込みデータの直列化・復元）
- src/application/useCases/loadRouteListTables.ts（ビルド時の一覧データ取得）
- src/application/routeListPublication.ts（JSON-LD・llms-full.txt の生成）
- src/entrypoints/prerender.tsx（ビルド時の描画とデータ取得）

主要 UI 要素。

- 国内航路一覧テーブル
- 国際航路一覧テーブル
- 韓国国内航路一覧テーブル
- キーワード検索フォーム
- リセットボタン

## 5. データモデル

### 5.1 航路データ

航路データは PMTiles と詳細 JSON の組み合わせで構成される（設定は src/config/routeLayers.ts）。

- PMTiles: 線形データと最小限の属性を保持する。4 種類の航路を 1 つのファイル `https://pmtiles.searoute.info/searoute.pmtiles` に収め、source-layer で分ける
- 詳細 JSON: routeId ごとに 1 ファイル（`https://pmtiles.searoute.info/details/<フォルダ>/<routeId>.json`）。フォルダは source-layer 名、datasetName の順に試し、取得できなければ空の詳細として扱う
- 一覧用 JSON: 航路一覧画面が読み込む（`https://pmtiles.searoute.info/lightweight/<source-layer>.json`。期間限定航路は一覧に含めない）

主なデータセット。

| レイヤー ID | source-layer | datasetName |
|---|---|---|
| geojson_sea_route | seaRoute | seaRoute |
| geojson_international_sea_route | seaRoute_international | internationalSeaRoute |
| geojson_KR_sea_route | seaRoute_KR | seaRouteKR |
| geojson_limited_sea_route | seaRoute_limited | limitedSeaRoute |

主なプロパティ。

- routeId: 航路識別子
- lineId: 航路区間識別子
- businessName: 事業者名
- routeName: 航路名
- portName1, portName2: 区間の両端港名
- color: 航路表示色
- freq: 線幅計算用の頻度指標
- freqInfo: 運行頻度表示文言
- info: 補足情報
- shipName: 船名一覧
- url: 時刻表または公式サイト URL
- note: 状態属性

### 5.2 note の意味

- null または未設定: 通常航路
- season: 季節運航
- suspend: 運休・休止中

この note 値は表示スタイル、一覧の行スタイル、表示フィルターに影響する。

### 5.3 港湾データ

港湾データは public/data/portData.geojson（配信時は ./data/portData.geojson）を使用する。主なプロパティは港名と補足情報である。

## 6. アーキテクチャ概要

### 6.1 技術要素

- 配信: Cloudflare Pages
- 実装方式: React 19 + TypeScript（strict）、Vite 8 によるマルチページビルド（index.html / routeList.html）
- 地図: MapLibre GL JS 6.18.0（npm `maplibre-gl`。ワーカーは `?worker&url` でバンドルし setWorkerUrl で指定）
- タイル: PMTiles 4.5.0（npm `pmtiles`）
- 検索補助: Maplibre Geocoder 1.9.4（npm `@maplibre/maplibre-gl-geocoder`）+ Nominatim
- スタイル: Tailwind CSS 4（`@tailwindcss/vite`）と独自 CSS（public/css/）
- アイコン: Font Awesome Free 7.3.1（npm `@fortawesome/free-solid-svg-icons` / `@fortawesome/free-brands-svg-icons`）をインライン SVG で描画
- PWA: manifest.json と service-worker.js
- 計測: Google Analytics

### 6.2 モジュール責務

依存方向（内向きのみ。`npm run lint` の eslint-plugin-boundaries で検査）。

```mermaid
flowchart TD
    E["**entrypoints/**
    main-map.tsx · main-routeList.tsx
    mapApp.tsx · routeListApp.tsx · mountApp.tsx
    afterFirstPaint.ts · prerender.tsx
    mapServices.ts · routeListServices.ts
    serviceWorkerRegistration.ts"]

    P["**presentation/**
    common/ · map/ · routeList/ · hooks/"]

    AD["**adapters/**
    map/ · data/ · analytics/ · browser/
    geocoding/ · http/ · persistence/"]

    A["**application/**
    ports.ts · useCases/ · viewModels/"]

    D["**domain/**
    routeFilter · shareContext
    geoBounds · route · seaRoute"]

    C["**config/**
    layerConfig · routeLayers · mapStyles"]

    E --> P & AD & A
    P --> A & D & C
    AD --> A & D & C
    A --> D & C
    C --> D
```

- presentation は adapters を参照しない。地図ページが必要とするサービスは `presentation/map/mapPageServices.tsx` の `MapPageServices`（地図操作は MapLibre 非依存の `MapHandle`）として宣言し、entrypoints が実装して React Context（`MapServicesProvider`）で注入する。
- MapLibre のコントロール（ハンバーガー・レイヤー・航路フィルター）は adapters の `ContainerControl` が空のコンテナを地図へ追加し、React がポータルで中身を描画する。
- ビルド時プリレンダリング（SSG）: vite.config.ts の `searoute-prerender` プラグインがクライアントビルド後に `src/entrypoints/prerender.tsx`（react-dom/server の renderToString）を実行し、各ページの静的マークアップとビルド番号を `dist/*.html` の `#app` に埋め込む。クライアントは `hydrateRoot`（開発サーバーでは空のため `createRoot`）。地図・データ取得は副作用で実行するため、プリレンダリング結果は旧版の静的 body と同等（tests/entrypoints/prerender.test.tsx で旧版 HTML と比較）。
- 航路一覧のビルド時取得: プラグインは `loadPrerenderRouteTables`（lightweight JSON を取得、1 件でも失敗したらビルド失敗）で得た航路データを routeList.html の `#app`（全行）・`<script type="application/json" id="route-list-data">`・`ItemList` JSON-LD として埋め込み、`dist/llms-full.txt` を出力する。クライアントは埋め込みデータがあれば取得せずに ready 状態で開始する。環境変数 `SEAROUTE_SKIP_ROUTE_DATA=1` で取得・埋め込み・llms-full.txt 生成を省略（E2E の webServer で使用）。
- 読み込み順序（パフォーマンス）: エントリーは小さく保ち、プリレンダリング済み HTML の初回描画（first-contentful-paint）を待ってから React アプリを動的 import してハイドレーションする（startTransition で分割実行）。MapLibre（約 310KB gzip）は地図生成時（ハイドレーション後の副作用）に動的 import する。
- アイコン: 旧版（Font Awesome Free 6.4.0）の Web フォント・CSS（CDN）は使わず、Font Awesome Free 7.3.1 のうち使用するアイコンだけを `presentation/common/Icon.tsx` がインライン SVG で描画する（`<i class="fa-solid fa-xxx">` の class は維持）。寸法・位置を再現する CSS は `src/styles/icons.css` で、ビルド時に各 HTML の head へインライン展開する。
- Cookie バナー: index.html head のインラインスクリプトが同意 Cookie の有無で `<html data-cookie-banner="show">` を付け、インライン CSS で HTML 解析中から表示する（JS 無効・同意済みは非表示）。React は閉じた後の非表示のみ管理する。

レイヤーごとの主な責務。

| レイヤー | ファイル | 責務 |
|---|---|---|
| entrypoints | main-map.tsx | マップ画面のエントリー（CSS 読み込み・GA 遅延読み込み・SW 登録。初回描画後に mapApp.tsx を動的 import） |
| entrypoints | mapApp.tsx / mountApp.tsx / afterFirstPaint.ts | React アプリのマウント（startTransition 内で hydrateRoot）と、FCP 後まで読み込みを遅らせる処理 |
| entrypoints | mapServices.ts | マップ画面の Composition Root（adapters → MapPageServices。MapLibre を含む adapters/map/mapFactory は地図生成時に動的 import） |
| entrypoints | main-routeList.tsx / routeListApp.tsx / routeListServices.ts | 一覧画面のエントリー（初回描画後に routeListApp.tsx を動的 import）と Composition Root |
| entrypoints | serviceWorkerRegistration.ts | Service Worker 登録・即時切替 |
| entrypoints | prerender.tsx | ビルド時プリレンダリング（サービスを空実装にして各ページを renderToString） |
| application | ports.ts | ポート（インターフェース）定義 |
| application | useCases/drawerUseCases.ts | 航路・港湾・座標の選択、共有 URL からの復元、背景クリック |
| application | useCases/shareUseCases.ts | 共有 URL の復元・コピー・対象レイヤー有効化 |
| application | useCases/mapUseCases.ts | 初期表示位置、表示位置の永続化、現在地追従ズーム |
| application | viewModels/drawerViewModel.ts | ドロワーの種別・開閉・本文（表示モデル）、ドロワー操作の登録 |
| application | viewModels/mapViewModel.ts | ベースマップ・表示レイヤーの状態管理 |
| application | viewModels/routeFilterViewModel.ts | 航路フィルターの状態管理・Cookie 復元と永続化 |
| application | viewModels/routeListViewModel.ts | 一覧テーブルの読み込み状態・検索クエリ管理 |
| adapters/map | mapFactory.ts | MapLibre 地図生成・標準コントロール・ジオコーダー・ピン |
| adapters/map | controlContainer.ts | React で中身を描画する MapLibre コントロールのコンテナ |
| adapters/map | geoJsonLayerAdapter.ts | GeoJSON（港湾）レイヤー・クリックイベント・共有航路のフォーカス |
| adapters/map | pmtilesLayerAdapter.ts | PMTiles 航路レイヤー追加・フィルター・ズーム・ハイライト |
| adapters/map | layerManager.ts | ベースマップ切替・オーバーレイ追加削除・表示順管理 |
| adapters/map | mapViewportGuard.ts | マップリサイズ監視・moveend の表示位置永続化 |
| adapters/map | mapRegistry.ts / mapCamera.ts | 生成済み地図インスタンスの保持・カメラ操作（MapLibre 本体を読み込まずに使う） |
| adapters/http | fetchWithRetry.ts | 再試行つきの fetch |
| adapters/data | dataLoader.ts / routeDetailsRepository.ts / routeListRepository.ts / wikipediaImageAdapter.ts | データ取得・キャッシュ・ローディング制御・画像検索 |
| adapters/geocoding | nominatimGeocodingAdapter.ts | Nominatim 地名検索・逆ジオコーディング |
| adapters/persistence | cookieControl.ts | Cookie の読み書き（SettingsStore） |
| adapters/analytics | googleAnalyticsAdapter.ts / googleAnalyticsLoader.ts | gtag イベント送信、gtag.js 読み込みと Cookie 同意 |
| adapters/browser | browserAdapters.ts | URL・履歴・クリップボード |
| presentation/map | MapPage.tsx | 地図ページのルート。初期化順序の管理 |
| presentation/map | DetailDrawer.tsx / detailDrawerController.ts / DrawerBody.tsx | 詳細ドロワー（開閉アニメーション・モバイルスナップ・本文描画） |
| presentation/map | HamburgerMenu.tsx / LayerControl.tsx / RouteFilterControl.tsx | 地図コントロールの UI |
| presentation/map | touchPanelToggle.ts | コントロールパネルのホバー・タッチ開閉 |
| presentation/map | ContextMenu.tsx / mapPointerInteractions.ts | 右クリックメニュー・長押し |
| presentation/common | InfoWindow.tsx / PrivacyPolicyWindow.tsx / modalController.ts / ModalContext.tsx | モーダルの表示・フォーカス管理 |
| presentation/common | CookieBanner.tsx / toast.tsx / loadingIndicator.tsx / outsideClickHandler.ts | 共通 UI 部品 |
| presentation/common | Icon.tsx | Font Awesome アイコンのインライン SVG 描画（使用するアイコンを `ICONS` に登録する） |
| presentation/routeList | RouteListPage.tsx | 一覧テーブル・検索・ハイライト |
| presentation/hooks | useViewModelState.ts | ViewModel を useSyncExternalStore で購読 |
| config | layerConfig.ts / routeLayers.ts / mapStyles.ts | レイヤー一覧・PMTiles 航路レイヤー・地図スタイル定義 |
| domain | routeFilter.ts / shareContext.ts / geoBounds.ts / route.ts / seaRoute.ts | フィルター正規化・共有 URL・境界計算・航路データ正規化/検索 |

### 6.3 Presentation パターン（MVVM）

本アプリの Presentation 層は MVVM を採用する。

- View: React コンポーネント（JSX 描画、入力イベント、MapLibre コントロールへのポータル描画）
- ViewModel: 画面状態と状態遷移（初期化、検索、フィルター、開閉）
- Model: Domain / Application / Adapter が提供するデータ・操作

主要な ViewModel は以下。

- src/application/viewModels/routeListViewModel.ts
- src/application/viewModels/mapViewModel.ts
- src/application/viewModels/routeFilterViewModel.ts
- src/application/viewModels/drawerViewModel.ts

ViewModel はフレームワーク非依存で、React からは `useViewModelState`（useSyncExternalStore）で購読する。Entrypoint は Composition Root として依存を組み立てて注入し、業務ルールは Domain / Application 側へ委譲する。

## 7. 機能仕様

機能仕様は以下の共通フォーマットで記述する。

- 目的
- 入力または対象
- 期待動作
- 受け入れ条件

### 7.1 MAP-01 初期表示

目的。

利用者がページを開いた直後に、保存済み状態または既定状態で地図を表示する。

入力。

- Cookie の currentMap
- Cookie の currentLayer
- Cookie の mapCenter
- Cookie の mapZoom

期待動作。

- Cookie が存在する場合は保存済みの地図種別、表示レイヤー、中心座標、ズームを復元する
- Cookie が存在しない場合は既定状態で初期表示する
- 既定のデータレイヤーは日本国内航路である
- 地図ロード完了後に詳細ドロワー領域を表示可能にする

受け入れ条件。

- 画面リロード後も前回の中心座標とズームが維持される
- 表示中レイヤーが再現される
- ベースマップが再現される

### 7.2 MAP-02 ベースマップ切替

目的。

利用者が背景地図を切り替えられるようにする。

対象種別。

- OSM Custom
- OSM Bright
- OSM Planet
- 地理院 標準
- 地理院 淡色
- 地理院 白地図
- OpenTopoMap
- TransportMap

期待動作。

- ベースマップ変更時に既存の GeoJSON / Tile オーバーレイ状態を維持する
- 必要に応じて raster レイヤーを削除・再追加する
- currentMap を Cookie に保存する

受け入れ条件。

- 切替後もデータレイヤーが消えない
- 港マーカー画像が必要時に再登録される
- 再読み込み後に切替結果が保持される

### 7.3 MAP-03 オーバーレイ / データレイヤー切替

目的。

利用者が raster オーバーレイと GeoJSON データレイヤーを個別に表示・非表示できるようにする。

対象オーバーレイ。

- tile_gsi_photo
- tile_gsi_relief
- tile_esriimagery
- tile_railwaymap
- tile_openseamap

対象 GeoJSON レイヤー。

- geojson_port
- geojson_sea_route
- geojson_international_sea_route
- geojson_KR_sea_route
- geojson_limited_sea_route

期待動作。

- レイヤー追加時にソースとレイヤーを正しく登録する
- レイヤー削除時に関連レイヤーとソースを削除する
- レイヤー順序は layerPriorities に従う
- currentLayer を Cookie に保存する

受け入れ条件。

- チェックボックス操作で表示状態が切り替わる
- 同一レイヤー追加時に二重登録しない
- 非表示後に再表示しても動作が壊れない

### 7.4 MAP-04 航路描画

目的。

航路種別ごとに線・ラベルを描画し、属性に応じた表示差分をつける。

期待動作。

- 各航路レイヤーは outline, solidline, dashline, thinline, name で構成される
- note に応じて通常線、季節線、休止中線を描き分ける
- color があれば線色と文字色に反映する
- freq に応じてズーム別に線幅を変化させる
- ラベルはズームに応じて事業者名、航路名の表示量を変える

受け入れ条件。

- season は破線、suspend は細い点線として表示される
- ラベルが線上に追従する
- 航路種別ごとにデータソースが正しい

### 7.5 MAP-05 港湾描画

目的。

港湾位置をマーカーと港名で表示する。

期待動作。

- anchor_marker 画像を登録する
- 港湾データソースを読み込む
- シンボルレイヤーとしてアイコンと名称を表示する

受け入れ条件。

- 港湾レイヤーを ON にするとアイコンと名称が表示される
- スタイル変更後も再表示可能である

### 7.6 MAP-06 航路クリック詳細

目的。

利用者が航路をクリックした際に、詳細ドロワーで情報を確認できるようにする。

表示内容。

- 事業者名
- 事業者名の補助表記
- 航路名
- 選択区間名
- 運行頻度
- 補足情報
- 船名一覧
- 船の画像（Wikipedia で見つかった場合のみ）
- 外部リンク

期待動作。

- クリック対象の properties と routeId ごとの詳細 JSON を詳細ドロワーに反映する
- 事業者名に全角括弧が含まれる場合は主表記と副表記に分離する
- 航路名または区間名クリックでズーム関数を呼ぶ
- marker_click イベントを計測する

受け入れ条件。

- 情報が欠損している項目はセクションを表示しない
- URL が不正でも画面生成自体は失敗しない
- HTML エスケープにより表示文字列が壊れにくい

### 7.7 MAP-07 港湾クリック詳細

目的。

利用者が港をクリックした際に、港湾情報を詳細ドロワーで確認できるようにする。

表示内容。

- 港名
- Google マップ検索リンク
- 補足情報

期待動作。

- 港名に 港 または 桟橋 を含まない場合は検索語に 港 を補う
- 詳細ドロワーに Google マップへのリンクを表示する

受け入れ条件。

- 港名クリック後にドロワーが開く
- 情報がない場合でも最低限の地図リンクは表示される

### 7.8 MAP-08 航路ズームとハイライト

目的。

利用者が航路全体または区間を地図上で見つけやすいようにする。

期待動作。

- routeId または routeId + lineId から対象 feature を取得する
- source キャッシュがなければ map ソースからフォールバック取得する
- feature 群から境界ボックスを計算する
- ドロワー表示状態に応じて fitBounds の padding を調整する
- 対象 feature を route-highlight として強調表示する
- 別地点クリックまたはドロワー閉鎖でハイライトを解除する

受け入れ条件。

- 航路名クリックで航路全体へズームする
- 区間名クリックで区間または routeId フォールバック対象へズームする
- ハイライトが二重に残らない

### 7.9 MAP-09 休止中航路の表示設定

目的。

利用者が休止中航路の表示有無を切り替えられるようにする。

期待動作。

- フィルターコントロールの suspend チェックで切り替える
- routeFilters Cookie に状態を保存する
- 互換維持のため showSuspendedRoutes Cookie も保存する
- OFF 時は thinline を非表示にし、outline と name は suspend を除外する
- ON 時は元のフィルターを復元する

受け入れ条件。

- トグル変更後に即座に表示が変わる
- 再読み込み後も設定が維持される

### 7.10 MAP-10 地名検索

目的。

利用者が地名検索で地図位置を移動できるようにする。

期待動作。

- Nominatim の forward geocode を利用する
- 候補結果から中心座標を算出する
- Geocoder UI を top-left に表示する

受け入れ条件。

- 一般的な地名で候補が返る
- API 失敗時に画面全体が壊れない

### 7.11 MAP-11 コンテキストメニューと長押し座標取得

目的。

PC では右クリック、モバイルでは長押しで座標確認と外部地図導線を提供する。

期待動作。

- PC では contextmenu でカスタムメニューを表示する
- モバイルでは長押しでピンを置き、詳細ドロワーを開く
- 長押し時に逆ジオコーディングで住所を取得する
- ドロワーを閉じたらピンを削除する

受け入れ条件。

- 長押し中にドラッグした場合は発火しない
- 住所取得失敗時は失敗メッセージを表示する

### 7.12 MAP-12 詳細ドロワー

目的。

PC とモバイルで詳細情報を見やすく提示する。

期待動作。

- PC では左サイドから表示する
- モバイルでは 30%、80%、最小高さのスナップ挙動を持つ
- ドラッグ、外側タップ、閉じるボタンに対応する
- ドロワーを閉じるとロングプレスピンと航路ハイライトも解除する

受け入れ条件。

- モバイルでスワイプに応じて高さが変わる
- リサイズ時に表示破綻しない
- 閉鎖時に残留状態が消える

### 7.13 LIST-01 航路一覧表示

目的。

一覧ページで全航路情報を表形式で閲覧できるようにする。

対象テーブル。

- 国内航路
- 国際航路
- 韓国国内航路

期待動作。

- 本番ビルドでは、各テーブルの一覧用 JSON をビルド時に取得し、全行を routeList.html の静的 HTML に描画しておく（JS を実行しないクローラーにも見える。詳細は SEO-01）
- 同じデータを `<script type="application/json" id="route-list-data">` として埋め込み、ブラウザはそれを初期状態にしてハイドレーションする。このとき一覧用 JSON は取得しない
- 埋め込みデータが無い・壊れている場合（開発サーバー、`SEAROUTE_SKIP_ROUTE_DATA=1` のビルド）は、従来どおりブラウザで一覧用 JSON を fetch して描画する
- note が season の行は season-row クラスを付与する
- note が suspend の行は suspend-row クラスを付与する
- URL があれば別タブで開くリンクを表示する

受け入れ条件。

- 3 テーブルとも表示される
- 欠損値は - で表示する
- 本番の routeList.html のソースに航路名が含まれ、表示時に一覧用 JSON への通信が発生しない
- サーバー描画とブラウザの初回描画が一致し、ハイドレーションのエラーが出ない

### 7.14 LIST-02 一覧検索

目的。

一覧ページ上でキーワード検索を行えるようにする。

期待動作。

- 入力するたびに（検索ボタンなしで）一致する行だけを表示する。日本語入力の変換中は絞り込まず、確定時に絞り込む
- 検索語があるとき一致件数を表示する
- 一致箇所をハイライト表示する
- 一件も見つからない場合はメッセージを表示する
- 検索欄の✕ボタンで検索語、ハイライト、非表示状態を初期化する（検索語が空のときは✕を出さない）。検索・リセットボタンは廃止

受け入れ条件。

- 複数テーブル横断で検索できる
- ハイライト解除後に元の表示に戻る

### 7.15 PWA-01 PWA 基本要件

目的。

スマートフォンでのホーム画面追加と基本的なキャッシュ利用を可能にする。

期待動作。

- manifest.json に name, short_name, display, icons が定義されている
- service-worker.js が install 時に主要静的ファイル（アイコン画像と style/empty.json）をキャッシュする
- fetch 時はネットワーク優先で取得し、失敗したときだけキャッシュから返す（詳細は docs/service-worker-guide.md）

受け入れ条件。

- 対応ブラウザでインストール可能と認識される
- キャッシュ済み対象は再訪時に利用できる

### 7.16 MAP-13 共有 URL の生成と復元

目的。

利用者が表示中の航路、港湾、座標情報を URL で共有し、受信側が同じ文脈を再現できるようにする。

対象。

- 詳細ドロワーの共有ボタン
- URL クエリ share
- routeId, sourceId, lat, lng, zoom, name

期待動作。

- 航路、港湾、座標のドロワー文脈から共有 URL を生成する
- 共有 URL コピー成功時に一時的なフィードバックを表示する
- 初期表示時に URL クエリを解析し、対象レイヤーを必要に応じて有効化してから復元処理を行う
- 復元成功時はクエリ文字列を URL から除去する

受け入れ条件。

- 航路共有 URL で該当航路ドロワーが開く
- 港湾共有 URL で該当港湾ドロワーが開く
- 座標共有 URL で座標ドロワーが開く
- 共有対象レイヤーが未表示でも復元処理が継続される

### 7.17 MAP-14 航路フィルター設定

目的。

利用者が航路の状態と航送可否を条件に表示を絞り込めるようにする。

対象。

- 状態フィルター: active, season, suspend
- 航送可否フィルター: car, bike, bicycle

期待動作。

- フィルターコントロールでチェック状態を変更できる
- チェック状態を routeFilters Cookie に保存し、再読み込み時に復元する
- 旧設定 routeFilterMode と showSuspendedRoutes が存在する場合は互換的に初期状態へ変換する
- 既定値から変更がある場合はフィルタートグルを active 表示にする

受け入れ条件。

- フィルター変更後に地図表示が即時更新される
- 再読み込み後も選択状態が維持される
- 既定値へ戻すと active 表示が解除される

### 7.18 LIST-03 一覧から地図への遷移

目的。

一覧ページから選択した航路を地図ページで即座に確認できるようにする。

対象。

- 一覧の航路名リンク
- index.html への share 付き URL

期待動作。

- 航路名セルを share=route 付き URL リンクとして出力する。URL は `buildRouteMapPath`（src/domain/route.ts）で作る相対 URL `./?share=route&routeId=<id>&sourceId=<sourceId>` とし、ホストに依存させない（ビルド時の描画とブラウザの描画を一致させるため）
- routeId と sourceId をクエリに付与して地図ページへ遷移する
- 遷移先では共有 URL 復元機能により対象航路ドロワーを表示する

受け入れ条件。

- 一覧の航路名クリックで地図ページへ遷移する
- 遷移後に対象航路の詳細ドロワーが表示される

### 7.19 SEO-01 AI・クローラー向けの公開

目的。

JS を実行しない AI クローラー・AI エージェント・検索エンジンにも航路情報を読めるようにし、AI 検索の回答に引用されやすくする（AI 検索で用が済みクリックが減る状況への対策）。

対象。

- routeList.html（静的 HTML の全航路、埋め込みデータ、構造化データ）
- llms.txt / llms-full.txt
- 404.html
- sitemap.xml / robots.txt（.cloudflare/build.sh が main ブランチのビルドでのみ生成）

期待動作。

- routeList.html: 全航路の表を静的 HTML に含める（LIST-01）。`<head>` に schema.org の `ItemList` JSON-LD を入れ、各要素は `position` / `name`（事業者 航路名）/ `url`（`https://searoute.info/?share=route&...`）を持つ。`numberOfItems` に全航路数を入れる
- routeList.html の検索向け文言: title / description / OGP / Twitter は同じ文言で「フェリー」「旅客船」「時刻表」を含める。h1 は「フェリー・旅客船 航路一覧」。h1 の下に導入文（`.route-list-intro`）を置き、データがあればテーブルごとの掲載航路数を添える。`robots` は `index,follow,max-image-preview:large`。WebPage の JSON-LD にパンくず（トップ → 航路一覧）を持つ
- 公開する絶対 URL（canonical、og:url、JSON-LD、llms.txt、llms-full.txt、sitemap.xml、404 ページのリンク）は Cloudflare Pages の正規形にそろえる。Pages は `.html` 付きの URL を 308 でリダイレクトする（`/routeList.html` → `/routeList`、`/index.html` → `/`）ため、リダイレクト元を正規 URL として示さない。サイト内の相対リンクも同じ正規形（`./routeList`、`./?share=...`）にし、リダイレクトを挟まないようにする（Vite の開発サーバー・preview も `.html` なしの URL を配信できる）
- 埋め込みデータと JSON-LD は `<` を `<` にエスケープし、航路名に `</script>` が含まれても HTML が壊れないようにする
- llms.txt: サイト概要と主要ページへのリンク（public/llms.txt を手で管理）。llms-full.txt へのリンクを含める
- llms-full.txt: ビルド時に一覧用 JSON から生成する Markdown。カテゴリ（国内航路 / 国際航路 / 韓国国内航路）ごとに `- 事業者｜航路名（船名）［運航情報］: 地図URL / 公式: URL` を並べる（無い項目は省略、改行などの空白は 1 つの空白にまとめ、事業者名と航路名が両方空の行は出さない）。末尾に、最新情報は公式を優先する旨の注意書きを置く
- 404.html: 存在しない URL に HTTP 404 を返す（Cloudflare Pages は 404.html が無いと全 URL に 200 で index.html を返し、ソフト404 になる）。外部 CSS / JS に依存しない自己完結の静的ページで、`noindex`、地図と航路一覧へのリンクを持つ。sitemap.xml には含めない

設計判断。

- 生成方式はビルド時取得（SSG）とした。航路データの更新頻度が低いため。更新頻度が上がった場合は、Cloudflare Pages Functions でリクエスト時に差し込む方式へ移行できるよう、変換処理は application 層の純関数にしてある
- 生成物は searoute.info 上に置く（pmtiles.searoute.info に置くと評価が別ドメインに付くため）
- ai-catalog.json / ard.json（Agentic Resource Discovery）は作らない。エージェントが呼び出せる API や MCP サーバーを公開していないため。公開する場合は両方を置く

受け入れ条件。

- 本番の routeList.html に航路名・`id="route-list-data"`・`"ItemList"` が含まれる
- /llms-full.txt が 200 で全航路を返す
- 存在しない URL（例: /.well-known/ai-catalog.json）が 404 を返す
- sitemap.xml に 404.html が含まれない

### 7.20 OPS-01 航路データ更新とビルド

目的。

R2 の航路データが更新されたら、ビルド時に埋め込んだ一覧データも自動で更新する。また、取得に失敗した状態のまま空の一覧を公開しない。

期待動作。

- ビルド時の取得: vite.config.ts の `searoute-prerender` プラグインが `loadPrerenderRouteTables` を呼ぶ。一覧用 JSON 3 件（`ROUTE_LIST_TABLE_CONFIGS`）を、CDN キャッシュを避けるクエリ `?v=<時刻>` 付きで、1 件あたり 30 秒のタイムアウトで取得する
- 次のいずれかでビルドを失敗させる（Cloudflare Pages では前回のデプロイが残る）: 取得失敗（HTTP エラー・タイムアウト）、データが空（`航路データが空です: <URL>`）
- `SEAROUTE_SKIP_ROUTE_DATA=1` のときは取得・埋め込み・llms-full.txt の生成を行わない（E2E 用。playwright.config.ts の webServer で指定）
- 自動再ビルド: searoute-pmtiles の deploy-r2.yml は、`geojson/` または `details/` に変更があると lightweight JSON を作り直して R2 へアップロードし、最後に Cloudflare Pages の Deploy Hook（GitHub Secret `CF_PAGES_DEPLOY_HOOK`、main ブランチ）を呼ぶ。Secret が未設定なら警告のみで失敗にしない
- develop などのプレビューは Cloudflare Access で保護されているため、外部からの確認はできない（ログインしたブラウザで確認する）

受け入れ条件。

- R2 の一覧用 JSON を更新すると、本番の routeList.html と llms-full.txt に反映される
- 一覧用 JSON が取得できない・空のとき、ビルドが失敗する

## 8. 状態管理

状態は Runtime（ViewModel）と Cookie 永続化に分けて管理する。

Runtime 状態（主要）。

- mapViewModel: baseMap, enabledLayers
- routeFilterViewModel: status / carriage フィルター状態
- routeListViewModel: table 読み込み状態、検索クエリ
- drawerViewModel: drawer.type, drawer.isOpen, selectedRoute, coordinate, context

Cookie で以下を保持する。

| キー | 内容 | 保持期間 |
|---|---|---|
| currentMap | ベースマップ ID | 30 日 |
| currentLayer | 表示中レイヤー ID のカンマ区切り | 30 日 |
| mapCenter | 地図中心座標 | 30 日 |
| mapZoom | 地図ズーム値 | 30 日 |
| routeFilters | 航路フィルター状態 JSON | 365 日 |
| showSuspendedRoutes | 休止中航路表示フラグ | 365 日 |
| cookieConsent | Cookie バナーを閉じたこと（アクセス解析の同意） | 365 日 |

## 9. 外部依存

外部依存が失敗した場合でも、可能な範囲で画面全体の利用不能を避けることを基本方針とする。

主要依存。

- MapLibre GL JS
- Maplibre Geocoder
- 航路データの配信（`https://pmtiles.searoute.info/`）。一覧用 JSON はビルド時にも取得するため、R2 の障害はビルドの失敗になる（OPS-01）
- Cloudflare Pages の Deploy Hook（searoute-pmtiles からの再ビルド）
- Nominatim 検索 API
- Wikipedia API（船の画像検索）
- Google Maps URL スキーム
- Google Analytics
- 各種タイルサーバー

注意点。

- Nominatim 失敗時は検索結果や住所取得が空になる可能性がある
- タイルサーバー障害時は背景地図のみ不完全になる可能性がある
- Analytics 失敗は主要機能に影響してはならない

## 10. 非機能要件

### 10.1 可用性

- 静的ファイルのみで配信可能であること
- 外部 API の一部失敗時でも主要画面を継続利用できること

### 10.2 操作性

- PC とモバイルの双方で主要機能が使えること
- モバイルでは長押し、スワイプ、PWA 表示に対応すること

### 10.3 保守性

- レイヤー追加時は layerConfig と対応データ、描画定義の整合が取りやすいこと
- 仕様変更時に回帰テスト観点が追跡可能であること

## 11. 変更時の影響分析チェックポイント

以下の変更を行う場合は、影響範囲を必ず確認する。

### 11.1 レイヤー追加・削除

- src/config/layerConfig.ts のレイヤー定義
- src/config/routeLayers.ts の PMTiles ソース設定
- src/adapters/map/layerManager.ts の addOverLayer / removeOverLayer
- src/adapters/map/geoJsonLayerAdapter.ts（港湾）と src/adapters/map/pmtilesLayerAdapter.ts（航路）の描画定義
- Cookie 復元
- レイヤー順序
- 一覧ページへの反映有無

### 11.2 詳細ドロワー変更

- 航路クリック
- 港クリック
- 長押し座標表示
- モバイルスナップ
- ハイライト解除

### 11.3 データ形式変更

- routeId / lineId の一致判定
- 詳細 JSON マージ
- 一覧テーブル生成
- ビルド時の埋め込みデータ・JSON-LD・llms-full.txt の生成（SEO-01）。`parseRouteListSnapshot` は配列かどうかしか検証しないため、埋め込みデータの形を変える場合は検証も合わせて変え、古い形のデータで描画が壊れないことを確認する
- note に依存する描画・色・行クラス

### 11.4 地図イベント変更

- クリック解除動作
- 右クリックメニュー
- 長押しの誤発火
- moveend による状態保存

### 11.5 共有 URL とフィルター変更

- share クエリのパース仕様
- 共有対象レイヤーの事前有効化
- 復元成功時のクエリ除去
- routeFilters と旧 Cookie 値の互換読み込み
- 一覧ページの routeId/sourceId 連携

## 12. 回帰テスト項目

### 12.1 スモークテスト

1. index.html が表示される
2. 初期地図が読み込まれる
3. 国内航路が表示される
4. routeList.html が表示される
5. 3 つの一覧テーブルにデータが入る

### 12.2 マップ機能テスト

1. ベースマップを 2 種類以上切り替え、データレイヤーが維持される
2. 港湾レイヤーを ON/OFF できる
3. 国内航路、国際航路、韓国国内航路、期間限定航路を個別に ON/OFF できる
4. 休止中航路トグルで suspend 表示が切り替わる
5. 航路クリックで詳細ドロワーが開く
6. 港クリックで詳細ドロワーが開く
7. 航路詳細の航路リンクで該当範囲へズームする
8. 区間リンクで該当区間または routeId フォールバックへズームする
9. ハイライトが一つだけ表示される
10. 何もない場所をクリックするとハイライトが消える
11. 地名検索で地図移動できる
12. リロード後に地図位置、ズーム、表示レイヤー、ベースマップが保持される
13. 状態フィルター active/season/suspend の各切替が反映される
14. 航送可否フィルター car/bike/bicycle の各切替が反映される
15. share クエリ付き URL で対象レイヤーが自動有効化され、ドロワーが復元される

### 12.3 モバイルテスト

1. 長押しでピンと座標ドロワーが開く
2. 長押し後に住所取得中表示が出る
3. 住所取得成功時に住所へ更新される
4. ドロワーを下へスワイプして最小化できる
5. ドロワーを上へスワイプして拡張できる
6. ドロワーを閉じるとピンとハイライトが消える

### 12.4 一覧ページテスト

1. キーワード検索で一致行のみ表示される
2. 一致文字がハイライトされる
3. 該当なし時にメッセージが出る
4. リセットで全文字・表示状態・ハイライトが戻る
5. note に応じた行スタイルが保たれる
6. 航路名リンクから地図ページへ遷移し、対象航路ドロワーが表示される
7. 実データでビルドした routeList.html のソースに航路名があり、表示時に lightweight JSON への通信がなく、コンソールにハイドレーションのエラーが出ない

### 12.6 AI・クローラー向け出力テスト

1. /llms.txt と /llms-full.txt が表示され、llms-full.txt に 3 カテゴリの航路が並ぶ
2. routeList.html に `ItemList` の JSON-LD がある
3. 存在しない URL が 404 を返し、404 ページから地図・一覧へ戻れる
4. sitemap.xml に 404.html が含まれない

### 12.5 PWA / キャッシュテスト

1. manifest が読み込まれる
2. service worker が登録される
3. 主要静的ファイルがキャッシュされる
4. キャッシュバージョン変更時に再配信が成立する

## 13. リリース前確認観点

- ブラウザコンソールに致命的エラーがない
- 外部リンクが正しく開く
- モバイル横幅でレイアウト崩れがない
- データ欠損行で UI が壊れない
- Cookie 保存が無効でも致命的に壊れない
- キャッシュ更新で古いファイルが残留しない
- 本番ビルドのログで航路データの取得が成功している（SEO-01 / OPS-01）

## 14. 今後の運用方針

機能追加・改修時は、最低でも以下をセットで更新する。

1. 本仕様書の該当章
2. 影響した受け入れ条件
3. 回帰テスト項目
4. 必要なら README の利用者向け説明

改修 PR では、変更内容がどの仕様 ID に影響するかを明記することを推奨する。

例。

- 影響仕様: MAP-06, MAP-08, MAP-13
- 追加確認: 12.2-5, 12.2-7, 12.2-9, 12.2-15