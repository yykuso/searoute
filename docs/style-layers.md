# スタイルレイヤー仕様 (maptiler-basic-ja-custom.json)

ソース: `https://tile.openstreetmap.jp/data/planet.json`（OpenMapTiles スキーマ）

---

## 目次

1. [背景](#背景)
2. [土地利用・地表被覆](#土地利用地表被覆)
3. [水域](#水域)
4. [建物・住所](#建物住所)
5. [道路・交通インフラ](#道路交通インフラ)
6. [鉄道・空中交通](#鉄道空中交通)
7. [行政境界](#行政境界)
8. [ラベル・POI](#ラベルpoi)
9. [特定地域（島）](#特定地域島)

---

## 背景

| レイヤーID | 和名 | タイプ | ズーム | 色 |
|---|---|---|---|---|
| `background` | 背景 | background | 全域 | `rgba(239, 237, 230, 1)` ベージュ |

---

## 土地利用・地表被覆

| レイヤーID | 和名 | source-layer | class / subclass | ズーム | 色 | 不透明度 |
|---|---|---|---|---|---|---|
| `landuse-residential` | 住宅地 | `landuse` | class: `residential` `suburb` `neighbourhood` | 全域 | `rgba(236, 234, 226, 1)` | 0.6 |
| `landcover_grass` | 草地 | `landcover` | class: `grass` | 全域 | `hsl(82, 46%, 72%)` 黄緑 | 0.45 |
| `landcover_wood` | 樹林 | `landcover` | class: `wood` | minzoom 7（z7:0→z8:0.1） | `#6a4` 緑 | stops [z7: 0, z8: 0.1] |
| `landcover_sand` | 砂地 | `landcover` | class: `sand` | 全域 | `rgba(232, 214, 38, 1)` 黄 | 0.3 |
| `landcover-ice-shelf` | 棚氷 | `landcover` | subclass: `ice_shelf` | 全域 | `hsl(47, 26%, 88%)` 薄黄 | 0.8 |
| `landcover-glacier` | 氷河 | `landcover` | subclass: `glacier` | 全域（z0:1→z8:0.5） | `hsl(47, 22%, 94%)` 白っぽい | stops [z0: 1, z8: 0.5] |
| `landuse` | 農地 | `landuse` | class: `agriculture` | 全域 | `#eae0d0` 薄茶 | 1 |
| `landuse_overlay_national_park` | 国立公園 | `landcover` | class: `national_park` | 全域（z5:0→z9:0.75） | `#E1EBB0` 薄黄緑 | stops [z5: 0, z9: 0.75] |

---

## 水域

### 水面（面）

| レイヤーID | 和名 | source-layer | 条件 | ズーム | 色 | 不透明度 |
|---|---|---|---|---|---|---|
| `water` | 水面 | `water` | intermittent≠1, brunnel≠tunnel | 全域 | `hsl(210, 67%, 85%)` 水色 | 1 |
| `water_intermittent` | 断続的水面 | `water` | intermittent=1 | 全域 | `hsl(205, 56%, 73%)` やや濃い水色 | 0.7 |

### 水路（線）

| レイヤーID | 和名 | source-layer | 条件 | ズーム | 色 | 線種 | 太さ |
|---|---|---|---|---|---|---|---|
| `waterway-tunnel` | 水路（トンネル） | `waterway` | brunnel=tunnel | 全域 | `hsl(210, 67%, 85%)` | 破線 [3,3] | stops [z8:1, z20:2] |
| `waterway` | 水路 | `waterway` | brunnel≠tunnel/bridge, intermittent≠1 | 全域 | `hsl(210, 67%, 85%)` | 実線 | stops [z8:1, z20:8] |
| `waterway_intermittent` | 断続的水路 | `waterway` | brunnel≠tunnel/bridge, intermittent=1 | 全域 | `hsl(210, 67%, 85%)` | 破線 [2,1] | stops [z8:1, z20:8] |
| `waterway-bridge-case` | 水路橋（外枠） | `waterway` | brunnel=bridge | 全域 | `#bbbbbb` グレー | 実線（gap付き） | gap: stops [z4:0.25, z20:30] / 枠: stops [z12:0.5, z20:10] |
| `waterway-bridge` | 水路橋 | `waterway` | brunnel=bridge | 全域 | `hsl(205, 56%, 73%)` | 実線 | stops [z4:0.25, z20:30] |

---

## 建物・住所

| レイヤーID | 和名 | source-layer | ズーム | 色 | 不透明度 |
|---|---|---|---|---|---|
| `building` | 建物 | `building` | 全域（z15から表示） | `rgba(222, 211, 190, 1)` 薄茶 | stops [z13: 0, z15: 1] |
| `housenumber` | 住居番号 | `housenumber` | minzoom 17 | `rgba(212, 177, 146, 1)` 茶 | 1 |

---

## 道路・交通インフラ

### 空港

| レイヤーID | 和名 | source-layer | class | ズーム | 色 | 不透明度 | 太さ |
|---|---|---|---|---|---|---|---|
| `aeroway-area` | 滑走路・誘導路（面） | `aeroway` | `runway` `taxiway` | minzoom 4（z14から表示） | `rgba(255,255,255,1)` | stops [z13:0, z14:1] | — |
| `aeroway-taxiway` | 誘導路 | `aeroway` | `taxiway` | minzoom 12 | `rgba(255,255,255,1)` | 1 | stops [z12:1, z17:10] |
| `aeroway-runway` | 滑走路 | `aeroway` | `runway` | minzoom 4 | `rgba(255,255,255,1)` | 1 | stops [z11:4, z17:50] |

### 道路（面・特殊）

| レイヤーID | 和名 | source-layer | 条件 | 色 |
|---|---|---|---|---|
| `road_area_pier` | 桟橋（面） | `transportation` | class=pier, Polygon | `hsl(47, 26%, 88%)` 薄黄 |
| `road_bridge_area` | 橋（面） | `transportation` | brunnel=bridge, Polygon | `hsl(47, 26%, 88%)` 薄黄（opacity 0.5） |

### 道路（線）

| レイヤーID | 和名 | source-layer | class | ズーム | 色 | 不透明度 | 太さ |
|---|---|---|---|---|---|---|---|
| `road_pier` | 桟橋 | `transportation` | `pier` | 全域 | `hsl(47, 26%, 88%)` | 1 | stops [z15:1, z17:4] |
| `road_path` | 歩道・トラック | `transportation` | `path` `track` | 全域 | `hsl(0,0%,97%)` ほぼ白 | 1（破線 [1,1]） | stops [z4:0.25, z20:10] |
| `road_minor` | 細街路・サービス道 | `transportation` | `minor` `service` | minzoom 13 | `rgba(245,245,245,0.97)` | 1 | stops [z4:0.25, z20:30] |
| `road_secondary_tertiary` | 2次・3次道路 | `transportation` | `secondary` `tertiary` | 全域（z10から表示） | `#fff` | stops [z9:0, z10:1] | stops [z6:0.5, z20:20] |
| `road_trunk_primary` | 幹線・1次道路 | `transportation` | `trunk` `primary` | 全域 | stops [z6: `#F3C18C`, z7: `rgba(251,191,16,1)`] 橙〜黄 | 1 | stops [z6:0.5, z20:30] |
| `road_major_motorway` | 自動車専用道路 | `transportation` | `motorway` | minzoom 6 | stops [z6: `#F3C18C`, z7: `rgba(76,206,68,1)`] 橙〜緑 | 1 | stops [z8:1, z16:10] |
| `road_major_motorway-z4-6` | 自動車専用道路（低ズーム） | `transportation` | `motorway` | z4〜z6 | stops [z4: `rgba(249,235,220,1)`, z6: `#F3C18C`] | 1 | stops [z4:0, z5:1] |

### トンネル

| レイヤーID | 和名 | source-layer | class | 色 | 線種 | 太さ |
|---|---|---|---|---|---|---|
| `tunnel_minor` | 細街路トンネル | `transportation` | `minor_road` (brunnel=tunnel) | `#efefef` | 破線 [0.36, 0.18] | stops [z4:0.25, z20:30] |
| `tunnel_major` | 幹線トンネル | `transportation` | `primary` `secondary` `tertiary` `trunk` (brunnel=tunnel) | `#fff` | 破線 [0.28, 0.14] | stops [z6:0.5, z20:30] |

### 橋（非表示・デフォルト `visibility: none`）

| レイヤーID | 和名 | class |
|---|---|---|
| `bridge_minor case` | 細街路橋（外枠） | `minor_road` |
| `bridge_major case` | 幹線橋（外枠） | `primary` `secondary` `tertiary` `trunk` |
| `bridge_minor` | 細街路橋 | `minor_road` |
| `bridge_major` | 幹線橋 | `primary` `secondary` `tertiary` `trunk` |

---

## 鉄道・空中交通

| レイヤーID | 和名 | source-layer | class | subclass | 追加条件 | ズーム | 色 | 不透明度 | 太さ | Overpass |
|---|---|---|---|---|---|---|---|---|---|---|
| `railway-transit-subway-tunnel` | 地下鉄トンネル | `transportation` | `transit` | `subway` | brunnel=tunnel | minzoom 14（タイル：z14から表示） | `hsl(34,12%,60%)` 中間茶 | stops [z14:0, z15:1] | stops [z14:0, z15:1, z18:2, z22:4] | |
| `railway-transit-subway` | 地下鉄 | `transportation` | `transit` | `subway` | brunnel≠tunnel | minzoom 14（タイル：z14から表示） | `hsl(34,32%,30%)` 濃茶 | stops [z14:0, z15:1] | stops [z14:0, z15:1, z18:2, z22:4] | |
| `railway-transit-tunnel` | 都市鉄道等トンネル | `transportation` | `transit` | `subway`以外 | brunnel=tunnel | minzoom 11（タイル：z11から表示） | `hsl(34,12%,60%)` 中間茶 | stops [z11:0, z12:1] | stops [z11:0, z12:1, z18:2, z22:4] | |
| `railway-transit` | 都市鉄道等 | `transportation` | `transit` | `subway`以外 | brunnel≠tunnel | minzoom 11（タイル：z11から表示） | `hsl(34,32%,30%)` 濃茶 | stops [z11:0, z12:1] | stops [z11:0, z12:1, z18:2, z22:4] | |
| `railway` | 鉄道 | `transportation` | `rail` | `funicular`以外 | `service`タグなし | minzoom 8（タイル：z8から表示） | `hsl(34,12%,30%)` 濃茶 | stops [z8:0, z14:1] | stops [z14:1.5, z18:3, z22:6] | [Overpass](https://overpass-turbo.eu/s/2ttj) |
| `railway-tunnel` | 鉄道トンネル | `transportation` | `rail` | `funicular`以外 | brunnel=tunnel | minzoom 8（タイル：z8から表示） | `hsl(34,12%,60%)` 中間茶 | stops [z8:0, z14:1] | stops [z14:1.5, z18:3, z22:6] | |
| `railway-service` | 操車場・側線・支線・交差 | `transportation` | `rail` | — | `service`タグあり | minzoom 14（タイル：z14から表示） | `hsl(34,12%,30%)` 濃茶 | stops [z14:0, z15:1] | stops [z14:0.5, z18:1, z22:2] | [yard](https://overpass-turbo.eu/s/2tte) / [siding](https://overpass-turbo.eu/s/2ttg) / [spur](https://overpass-turbo.eu/s/2ttd) / [crossover](https://overpass-turbo.eu/s/2ttm) |
| `railway-funicular` | ケーブルカー（鋼索鉄道）| `transportation` | `rail` | `funicular` | brunnel≠tunnel | minzoom 14（タイル：z14から表示） | `hsl(34,12%,30%)` 濃茶 | stops [z14:0, z15:1] | stops [z14:1.5, z18:3, z22:6] | [Overpass](https://overpass-turbo.eu/s/2ttp) |
| `railway-funicular-tunnel` | ケーブルカートンネル | `transportation` | `rail` | `funicular` | brunnel=tunnel | minzoom 14（タイル：z14から表示） | `hsl(34,12%,60%)` 中間茶 | stops [z14:0, z15:1] | stops [z14:1.5, z18:3, z22:6] | [Overpass](https://overpass-turbo.eu/s/2ttp) |
| `aerialway` | ロープウェイ・ゴンドラ | `transportation` | `aerialway` | — | — | minzoom 14（タイル：z12から表示） | `hsl(34,32%,30%)` 濃茶 | stops [z14:0, z15:1] | stops [z14:1.5, z18:3, z22:6] | [Overpass](https://overpass-turbo.eu/s/2tth) |

---

## 行政境界

| レイヤーID | 和名 | source-layer | 条件 | ズーム | 色 | 太さ |
|---|---|---|---|---|---|---|
| `admin_sub` | 都道府県・市区町村境界 | `boundary` | admin_level 4/6/8, maritime≠1 | 全域 | `hsla(0,0%,60%,0.5)` グレー | 破線 [2,1] |
| `admin_country_z0-4` | 国境（低ズーム） | `boundary` | admin_level≤2, claimed_by無し, maritime≠1, disputed≠1 | z0〜z24 | `hsl(248,7%,66%)` 青みグレー | stops [z0:0.6, z4:1.4, z5:2, z12:8] |
| `admin_country_z5-` | 国境（高ズーム） | `boundary` | admin_level≤2, maritime≠1 | minzoom 5 | `hsl(0,0%,60%)` グレー | stops [z3:0.5, z22:15] |

---

## ラベル・POI

### 交通施設

| レイヤーID | 和名 | source-layer | class / subclass | ズーム | アイコン | テキスト色 | テキストサイズ |
|---|---|---|---|---|---|---|---|
| `bus-label` | バス停 | `poi` | class=`bus`, rank 15〜24 | minzoom 15 | `bus`（size: z15=0.5 → z17=0.7 → z20=1.0） | `#000` | 9px（文字は z17 以降表示） |
| `railway-subway-label` | 地下鉄駅 | `poi` | class=`railway`, subclass=`subway` | minzoom 15 | `subway`（size: z15=0.7 → z20=1.5） | `#000` | 12px（文字は z15 以降表示） |
| `railway-halt-label` | 鉄道駅（停留所） | `poi` | class=`railway`, subclass=`halt` | minzoom 14 | `railway`（size: z14=0.7 → z20=1.5） | `#000` | 12px（文字は z15 以降表示） |
| `railway-label` | 鉄道駅（地下鉄・停留所以外） | `poi` | class=`railway`, subclass≠`subway` かつ subclass≠`halt` | minzoom 12 | `railway`（size: z12=0.5 → z14=0.7 → z20=1.5） | `#000` | 12px（文字は z14 以降表示） |
| `aerialway-label` | ロープウェイ駅 | `poi` | class=`aerialway`, subclass=`station` | minzoom 14 | `aeroway`（size: z14=0.7 → z20=1.5） | `#000` | 12px（文字は z15 以降表示） |
| `airport-label` | 空港 | `aerodrome_label` | iataタグあり | minzoom 10 | — | `#666` | 11px |

### 道路名・番号

| レイヤーID | 和名 | source-layer | 条件 | ズーム | テキスト色 | テキストサイズ |
|---|---|---|---|---|---|---|
| `road_major_label` | 道路名 | `transportation_name` | LineString, class≠ferry, class≠aerialway | minzoom 13 | `#000` | stops [z10:8, z20:14] |
| `aerialway_major_label` | ロープウェイ名 | `transportation_name` | LineString, class=aerialway | minzoom 14 | `#000` | stops [z10:8, z20:14] |
| `highway-shield` | 路線番号シールド | `transportation_name` | ref_length≤6, 米国路線以外 | minzoom 9 | — | 8px（アイコン: motorway系=`road_green_{ref_length}` / trunk・primary系=`road_yellow_{ref_length}` / その他=`road_black_{ref_length}`） |

### 一般POI

| レイヤーID | 和名 | source-layer | 条件 | ズーム | テキスト色 | テキストサイズ |
|---|---|---|---|---|---|---|
| `poi_label` | POIラベル | `poi` | rank=1 | minzoom 14 | `#666` | 11px |

### 地名

| レイヤーID | 和名 | source-layer | class | ズーム | テキスト色 | テキストサイズ |
|---|---|---|---|---|---|---|
| `place_label_other` | その他地名 | `place` | city/town/village/country/continent以外 | z3〜z8 | `rgba(92,32,1,1)` 茶 | stops [z6:10, z12:14] |
| `place_label_village` | 村・集落名 | `place` | `village` | z7〜 | `hsl(0,0%,0%)` 黒 | stops [z10:12, z15:22] |
| `place_label_town` | 町名 | `place` | `town` | z6〜 | `hsl(0,0%,0%)` 黒 | stops [z10:14, z15:24] |
| `place_label_city` | 市名 | `place` | `city` | z6〜 | `hsl(0,0%,0%)` 黒 | stops [z7:10, z11:20] |
| `country_label-other` | 国名（ISO無し）| `place` | `country` (iso_a2無し) | 〜z12 | `hsl(0,0%,13%)` ほぼ黒 | stops [z3:12, z8:22] |
| `country_label` | 国名 | `place` | `country` (iso_a2あり) | 〜z12 | `hsl(0,0%,13%)` ほぼ黒 | stops [z3:12, z8:22] |

---

## 特定地域（島）

独自ソースを使用した特別レイヤー。

| レイヤーID | 和名 | ソース | source-layer | ズーム | 色 |
|---|---|---|---|---|---|
| `island-hoppo` | 北方領土（面） | `hoppo` | `island` | minzoom 0 | `#EFEDE6` ベージュ |
| `island-hoppo-name` | 北方領土（名前） | `hoppo` | `island` | minzoom 6 | `#333` 濃グレー |
| `island-takeshima` | 竹島（面） | `takeshima` | `island` | minzoom 0 | `#EFEDE6` ベージュ |
| `island-takeshima-name` | 竹島（名前） | `takeshima` | `island` | minzoom 6 | `#333` 濃グレー |
| `island-takeshima-poi` | 竹島（POI名） | `takeshima` | `island_poi` | minzoom 6 | `#333` 濃グレー |

---

## ズームレベル早見表

| ズーム | 表示される主なもの |
|---|---|
| z0〜 | 背景、水面、国境、国名 |
| z4〜 | 滑走路（面）、自動車専用道路（薄） |
| z5〜 | 国境（高ズーム版）、幹線道路 |
| z6〜 | 自動車専用道路、市名・町名 |
| z7〜 | 樹林、村名 |
| z8〜 | 鉄道（フェードイン開始） |
| z9〜 | 国立公園（フェードイン） |
| z10〜 | 鉄道（ある程度見える）、2次道路 |
| z11〜 | 地下鉄等（フェードイン開始） |
| z12〜 | 誘導路、空港ラベル |
| z13〜 | 細街路、道路名 |
| z14〜 | 地下鉄等トンネル・ロープウェイ・ケーブルカー（表示開始）、駅アイコン・ロープウェイ駅アイコン・ロープウェイ名、POIラベル |
| z15〜 | 建物（完全表示）、操車場・側線・スパー（表示完了）、バス停 |
| z17〜 | 住居番号 |
