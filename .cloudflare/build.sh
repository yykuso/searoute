#!/bin/bash
set -e

# 1. 成果物用ディレクトリの作成
mkdir -p deploy

# 2. ファイルのコピー
rsync -av --exclude='deploy/' --exclude='.github/' --exclude='.git/' --exclude='.gitignore' --exclude='README.md' --exclude='_config.yml' ./ ./deploy/

# 3. GeoJSONの座標丸めと最適化
find deploy -name '*.geojson' | while read file; do
  jq 'def r: if type=="array" then map(r) elif type=="object" then with_entries(.value |= r) elif type=="number" then (.*100000|round)/100000 else . end;
      . as $in | if has("features") then .features |= map(if has("geometry") and .geometry.coordinates then .geometry.coordinates |= (r) else . end)
      elif has("geometry") and .geometry.coordinates then .geometry.coordinates |= (r) else . end' "$file" | jq -c . > tmp.geojson && mv tmp.geojson "$file"
done

# 4. JSONの最適化
find deploy -name '*.json' ! -name '*.geojson' | while read file; do
  jq -c . "$file" > tmp.json && mv tmp.json "$file"
done

# 5. JS/CSSの最適化 (npxを使用してインストール不要に)
find deploy -name '*.js' | while read file; do
  npx terser "$file" -c -m -o "$file.min" && mv "$file.min" "$file"
done

find deploy -name '*.css' | while read file; do
  npx esbuild "$file" --minify --outfile="$file.min" && mv "$file.min" "$file"
done

# 6. サイトマップとrobots.txtの生成
BASE_URL="https://searoute.info"
echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' > deploy/sitemap.xml
find deploy -name "*.html" | while read filepath; do
  relative_path="${filepath#deploy/}"
  url_path="${relative_path%index.html}"
  mod_time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "  <url><loc>${BASE_URL}/${url_path}</loc><lastmod>${mod_time}</lastmod></url>" >> deploy/sitemap.xml
done
echo '</urlset>' >> deploy/sitemap.xml

echo -e "User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml" > deploy/robots.txt