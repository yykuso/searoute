#!/bin/bash
set -e
set -o pipefail

# 1. 実行場所をリポジトリルートに固定
cd "$(dirname "$0")/.."

# 2. 成果物用ディレクトリの作成
rm -rf deploy
mkdir -p .tmp_deploy

# 3. ファイルのコピー
cp -r ./* .tmp_deploy/ 2>/dev/null || true

cd .tmp_deploy
rm -rf \
  .github .git .cloudflare .gitignore README.md _config.yml \
  node_modules tests test-results playwright-report tools \
  package.json package-lock.json \
  playwright.config.js vitest.config.js tailwind.config.js \
  css/tailwind-input.css
cd ..
mv .tmp_deploy deploy

# docs と src は配信対象外（存在する場合のみ削除）。
rm -rf deploy/docs
rm -rf deploy/src

# 4. GeoJSONとJSONの最適化 (jqの代わりにNode.jsを使用)
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

# 5. JS/CSSの最適化
if [ -d "deploy/js" ]; then
  find deploy/js -name '*.js' | while read file; do
    npx -p esbuild esbuild "$file" --minify --format=esm --outfile="$file.min" && mv "$file.min" "$file"
  done
fi

if [ -d "deploy/lib" ]; then
  find deploy/lib -name '*.mjs' | while read file; do
    npx terser "$file" --module -c -m --comments '/@license|copyright/i' -o "$file.min" && mv "$file.min" "$file"
  done
fi

if [ -d "deploy/css" ]; then
  find deploy/css -name '*.css' | while read file; do
    npx -p esbuild esbuild "$file" --minify --outfile="$file.min" && mv "$file.min" "$file"
  done
fi

if [ -d "deploy/lib" ]; then
  find deploy/lib -name '*.css' | while read file; do
    npx -p esbuild esbuild "$file" --minify --outfile="$file.min" && mv "$file.min" "$file"
  done
fi

# 6. サイトマップとrobots.txtの生成 (Production のみ)
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