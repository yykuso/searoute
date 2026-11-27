# 航路一覧画面のモダナイズ 設計

## 目的

航路一覧（routeList.html）は、地図側が Tailwind に移った後も旧来の CSS（public/css/route-list.css。float・固定幅 700px）のまま残っている。
コードの作り・見た目・スマホでの使い勝手をまとめて今の水準にそろえる。

## ゴール

- 旧 CSS を廃止し、地図側と同じ Tailwind CSS 4 にそろえる
- PC：今の表を整える（角丸・縞模様・見出し固定・ホバー強調、最大幅 1200px 程度で中央寄せ）
- スマホ（640px 未満）：同じ `<table>` を CSS だけでカード表示にする（横スクロールをなくす）
- 検索：入力のたびに絞り込む。ヒット件数を出し、✕ で消去できる

## 対象外

- ダークモード、並べ替え、条件フィルタ
- データの中身・取得方法の変更
- 地図画面の変更

## 失敗とみなすもの（アンチゴール）

- 全航路分の HTML が増える・重くなる（表とカードの二重描画はしない）
- ビルド時の静的 HTML・埋め込みデータ・JSON-LD・ハイドレーション（SEO-01 / LIST-01）が壊れる、ハイドレーションエラーが出る
- 静的 HTML の見た目が JS 読み込み後に大きく崩れる・ずれる

## 制約

- DOM は 1 つの `<table>` のまま。テーブル class（`sea-route-table` / `international-sea-route-table` / `sea-route-KR-table`）、行 class（`season-row` / `suspend-row`）、列見出し class（`route-id` など）、`#searchbox`、プレースホルダー「検索キーワードを入力」、`#search-message`、`route-search-highlight` は残す（テスト・既存参照のため）
- ViewModel（routeListViewModel.ts）の API（`search` / `reset`）は変えない
- CSS は Vite 経由で読み込む（`main-routeList.tsx` から `../styles/tailwind.css` を import）。routeList.html に `<!-- searoute:entry-css -->` を置き、既存の `asyncStylesheets` プラグインで非同期読み込みにする

## 検討した作り方

- **A. 同じ表を Tailwind で組み直し、スマホは CSS でカード化（採用）**：DOM が 1 つで、静的 HTML・SEO・ハイドレーションをそのまま使える。カードの凝ったデザインには限界がある
- B. 表とカードを両方描画して出し分け：HTML とハイドレーション負荷が倍になるため不採用
- C. 表をやめて全画面リスト：PC での一覧性が落ち、変更範囲も最大のため不採用

ユーザーが A を選んだ。

## 画面

### 共通

- 固定ヘッダー（全幅）：サイト名、「マップ」「航路一覧」ナビ（航路一覧は現在地として強調、`aria-current="page"`）
- h1「フェリー・旅客船 航路一覧」、導入文（`.route-list-intro`。文言・件数表示は今のまま）、フォーム案内（`.feedback-callout`）
- 検索バー（ヘッダー直下に固定）
  - 入力のたびに `viewModel.search` を呼ぶ。日本語入力の変換中（compositionstart〜end）は呼ばない。確定時に呼ぶ
  - 入力があるときだけ ✕ ボタン（`aria-label="検索語を消去"`）を出し、押すと `viewModel.reset()`
  - 検索語があるとき、表示中の行数を「N件」と出す。0 件なら `#search-message` に「見つかりませんでした。」
  - 「検索」「リセット」ボタンは廃止。Enter はフォーム送信させない
- ジャンプ用チップ：「国内 N」「国際 N」「韓国 N」（各 h2 へのページ内リンク、件数はデータがある表だけ）
- 凡例：季節運航（黄）・運休（赤）。各表の上ではなくチップの近くに 1 か所
- 季節運航・運休の行は今の背景色に加え、行の左端に色帯

### PC（640px 以上）

- 表は角丸の枠、行の縞模様、ホバーで強調、`thead` はヘッダー＋検索バーの下に固定
- h2 も固定（今と同様）。固定要素の高さは CSS 変数でそろえる

### スマホ（640px 未満）

- `table`/`tbody`/`tr`/`td` を block にし、`thead` は視覚的に隠す（スクリーンリーダー向けには残す）
- 1 行 = 1 カード：
  - 航路名（大きく、地図へのリンク）
  - 事業者名
  - 情報・船名（各 td の `data-label` を `::before` で「船名」などと表示）
  - 時刻表リンクはボタン風、航路 ID は小さく右下
- 値が「-」のセルはカードでは隠してよい（表示上のみ。セルの DOM は残す）

## 変更するもの

- src/presentation/routeList/RouteListPage.tsx：Tailwind のクラス付け、`data-label`、検索 UI、チップ・凡例。小さい部品に分けてよい
- src/entrypoints/main-routeList.tsx：tailwind.css を import
- routeList.html：route-list.css の読み込みを `<!-- searoute:entry-css -->` に置き換え
- public/css/route-list.css：削除（tests/fixtures/legacy は触らない）
- tests/presentation/routeList/routeListView.test.tsx、tests/e2e/route-list.spec.ts、tests/e2e/prerender.spec.ts：ボタン操作を入力・✕ に置き換え、件数表示・IME 中に絞り込まないことを追加
- docs/searoute-spec.md：LIST-01 / LIST-02、スタイルの記述を更新

## 作り手に任せること（判断済みの既定）

- 色：ヘッダー・見出しは今の水色（#bfd9f2）系を Tailwind の sky 系で近づける。リンクは今の青
- 固定要素の具体的な高さ、余白、角丸の大きさ
- 絞り込みが重ければ `useDeferredValue` を使う（全 500 行程度なので通常は不要）
- 件数の数え方は既存の `matchesRouteSearchText` に合わせる（`hasVisibleRow` を件数計算に一般化）
