#!/bin/bash
set -e
set -o pipefail

# 1. 実行場所をリポジトリルートに固定
cd "$(dirname "$0")/.."

# 2. ビルド番号（Cloudflare Pages のコミットSHA 先頭7桁）を Vite へ渡す
#    サイト情報の #site-build-number は React が import.meta.env.VITE_BUILD_NUMBER で描画する（vite.config.ts の define）
BUILD_SHA="${CF_PAGES_COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || echo local)}"
BUILD_NUMBER=$(printf '%.7s' "$BUILD_SHA")
export VITE_BUILD_NUMBER="${BUILD_NUMBER}"

# 3. 依存のインストールと Vite ビルド（型チェック込み）。JS/CSS の最小化は Vite が行う
npm ci
npm run build

# 4. 成果物を Cloudflare Pages の出力ディレクトリ（deploy/）へ配置
rm -rf deploy
mv dist deploy

# 5. GeoJSONとJSONの最適化 (jqの代わりにNode.jsを使用)
node -e '
const fs = require("fs");
const path = require("path");

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".json") || p.endsWith(".geojson")) {
      optimize(p);
    }
  });
}
function optimize(p) {
  let data = JSON.parse(fs.readFileSync(p, "utf8"));
  const round = (val) => typeof val === "number" ? Math.round(val * 100000) / 100000 : val;
  const processGeo = (obj) => {
    if (Array.isArray(obj)) return obj.map(processGeo);
    if (obj !== null && typeof obj === "object") {
      for (let key in obj) {
        if (key === "coordinates") obj[key] = processGeo(obj[key]);
        else obj[key] = processGeo(obj[key]);
      }
    }
    return round(obj);
  };
  fs.writeFileSync(p, JSON.stringify(p.endsWith(".geojson") ? processGeo(data) : data));
  console.log("Optimized:", p);
}
["deploy/data", "deploy/style"].forEach(walk);
optimize("deploy/manifest.json");
'

# 6. 静的配信する CSS（public/css）の最適化
if [ -d "deploy/css" ]; then
  find deploy/css -name '*.css' | while read file; do
    npx -p esbuild esbuild "$file" --minify --outfile="$file.min" && mv "$file.min" "$file"
  done
fi

# 7. サイトマップとrobots.txtの生成 (Production のみ)
if [ "${CF_PAGES_BRANCH}" = "main" ]; then
  BASE_URL="https://searoute.info"
  echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">" > deploy/sitemap.xml
  find deploy -name "*.html" | while read filepath; do
    relative_path="${filepath#deploy/}"
    url_path="${relative_path%index.html}"
    mod_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "  <url><loc>${BASE_URL}/${url_path}</loc><lastmod>${mod_time}</lastmod></url>" >> deploy/sitemap.xml
  done
  echo "</urlset>" >> deploy/sitemap.xml

  echo -e "User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml" > deploy/robots.txt
fi
