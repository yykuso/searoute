# Service Worker ガイド

## 概要

searoute は PWA（Progressive Web App）として動作し、Service Worker を使用してオフライン対応とキャッシュ管理を実現しています。

---

## キャッシュ戦略

### キャッシュ対象
- 静的アセット：favicon, apple-touch-icon, icons
- 初期化用 style：`./style/empty.json`
- **HTML は install キャッシュから除外**（Network-first のため）

### キャッシュ戦略：**Network-First with Cache Fallback**
1. リクエスト時はまずネットワークを試す
2. ネットワーク失敗時のみ、キャッシュから取得
3. ネットワーク成功時は、そのレスポンスをキャッシュに保存（同一オリジンのみ）
4. GET リクエストのみキャッシュ対象

**HTML（index.html）の特別取扱**
- `install` 時には先読みキャッシュしない（アセットのみ）
- `fetch` では Network-first なので、ネットワークが利用可能なら常に最新 HTML を取得
- 理由：HTML は頻繁に更新されるため、install キャッシュに含めると stale になる可能性

**メリット**
- 常に最新の HTML・データを取得できる
- 新機能追加時、ユーザーが即座に反映される
- オフライン時も静的リソースと最後のアクセス済みキャッシュで基本動作

---

## Service Worker ライフサイクル

### install
- `urlsToCache` リストをキャッシュストレージに登録
- `skipWaiting()` を呼び出し、待機状態を飛ばして即座に activate へ

### activate
- 現行バージョン（`CACHE_NAME`）以外のキャッシュを全削除
- `clients.claim()` を呼び出し、すべての client に適用

### fetch
- GET リクエストのみ処理
- ネットワーク → キャッシュの優先順で動作

---

## バージョン管理と更新

### キャッシュバージョンの変更手順
1. [service-worker.js](../service-worker.js) の `CACHE_NAME` を更新
   ```javascript
   const CACHE_NAME = 'searoute-v1.X';  // バージョン番号を上げる
   ```
2. 新バージョンで activate 時、旧バージョンのキャッシュが自動削除される

### Service Worker の更新タイミング
- ブラウザは定期的に (通常 24 時間以内) Service Worker の更新をチェック
- `registration.update()` を呼び出すと即座にチェック
- 新バージョンが検出されると `updatefound` イベント発火

### 即時切替（Skipwait）
`js/entrypoints/serviceWorkerRegistration.js` では以下の仕組みで待機中の Service Worker を即座に切り替える：

```javascript
if (registration.waiting) {
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}
```

Service Worker 側で：
```javascript
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

---

## メッセージ API（手動制御）

### SKIP_WAITING
待機中の Service Worker を即座に activate させる

```javascript
navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
```

### PURGE_ALL_CACHES
すべてのキャッシュを削除する（テスト・リセット用）

```javascript
navigator.serviceWorker.controller.postMessage({ type: 'PURGE_ALL_CACHES' });
```

---

## キャッシュ汚染問題と対処

### 問題背景
- 古い Service Worker が旧バージョンのファイル（特に JS）をキャッシュしていると、新バージョンのコードが読み込まれない
- ブラウザの DevTools キャッシュクリアでも Service Worker キャッシュが残ることがある

### 一度限りの緊急リセット（既に実行済み）
2026-07-17 に以下の緊急処置を実施：
- すべての Service Worker を unregister
- Cache Storage を全削除
- 新バージョンの Service Worker を再登録

**これは自動実行される一度限りの処理で、通常運用では動作しません。**

### 再度リセットが必要な場合
以下のコードを `index.html` に一時的に追加：

```javascript
const runOneTimeReset = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  window.location.reload();
};

runOneTimeReset()
  .then(() => navigator.serviceWorker.register('./service-worker.js'));
```

**注意**：リセット後、必ず上記コードを削除して通常運用に戻してください。

---

## ユーザー側でのキャッシュクリア

ユーザーが手作業でキャッシュをクリアしたい場合：

### Chrome / Edge
1. DevTools を開く（F12）
2. **Application** → **Cache Storage**
3. キャッシュ名（`searoute-vX.X`）を右クリック → **Delete**
4. または **Storage** → **Clear site data** で一括削除

### Firefox
1. DevTools を開く（F12）
2. **Storage** → **Cache Storage**
3. キャッシュを削除

### Safari
1. **設定** → **プライバシー** → **ウェブサイト データを管理**
2. サイトを検索して削除

---

## トラブルシューティング

| 症状 | 原因 | 対策 |
|------|------|------|
| 古いコードが表示される | Service Worker キャッシュが古い | DevTools で Cache Storage を削除 → 再読み込み |
| オフラインで何も表示されない | キャッシュが空 | 新バージョンで once 初期アクセスしてキャッシュを再構築 |
| Service Worker が登録されない | navigator.serviceWorker が undefined | HTTPS または localhost 環境で確認 |
| 動作が不安定 | 複数バージョンの Service Worker が混在 | 緊急リセット手順を実施 |

---

## 運用上の注意点

1. **バージョン更新時**：`CACHE_NAME` を明確に変更して、旧キャッシュ確実に削除される
2. **緊急リセット後**：リセットコードを通常運用に戻すまでの期間を明記してから実行
3. **ネットワーク優先戦略**：常に最新データを取得する仕様のため、データが同期される遅延はない
4. **HTTPS 必須**：Service Worker は HTTPS（または localhost）でのみ動作する
5. **定期的な更新チェック**：`registration.update()` で主動的に更新をチェックして、新バージョンがあれば即座に適用

---

## 参考リンク

- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN: Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Google: Workbox - キャッシュ戦略](https://developers.google.com/web/tools/workbox/modules/workbox-strategies)
