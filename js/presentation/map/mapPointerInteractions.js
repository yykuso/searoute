import { map } from '../../adapters/map/mapRegistry.js';
import { forwardGeocode, reverseGeocode } from '../../adapters/geocoding/nominatimGeocodingAdapter.js';
import { setDrawerContext } from '../shareDrawer.js';
import { hideDetailDrawer, showDetailDrawer } from './detailDrawerView.js';
import { showContextMenu } from './contextMenuView.js';
import { registerDrawerCloseHandler } from '../drawerViewModel.js';
import { configureDrawerPresenter } from '../drawerViewModel.js';

/**
 * 検索バーを追加する関数
 * MapLibreGeocoderを使用して、地名検索を行う
 */
export function addGeocoderControl() {
    const geocoderApi = {
        forwardGeocode: async (config) => forwardGeocode(config.query),
    };

    const geocoder = new MaplibreGeocoder(geocoderApi, {
        maplibregl: maplibregl,
        marker: {
            color: 'red'
        },
        placeholder: 'Search',
        collapsed: true,
        limit: 10,
        showResultsWhileTyping: true,
        OptionalminLength: 3,
        zoom: 12
    });

    // geocoderにクラスを追加
    geocoder.onAdd = function(map) {
        const container = MaplibreGeocoder.prototype.onAdd.call(this, map);
        container.classList.add('maplibregl-ctrl-group');
        return container;
    };

    return geocoder;
}

/**
 * 長押し・右クリックのインタラクションを登録する
 *
 * iOS Safari の制約:
 * - TouchEvent はイベントプールで再利用されるため、コールバック内で
 *   e.touches[0] を参照できない → touchstart 時点で座標を退避する
 * - 長押しすると iOS が touchcancel を発火してコールアウトを表示しようとする
 *   → CSS で `-webkit-touch-callout: none` を #map に付与して抑制する
 * - map.on('load') 以降に登録すると読み込み直後のタップに間に合わない
 *   → initMap() から直接呼び出して即時登録する
 */
export function addContextEvent() {
    const mapDiv = document.getElementById('map');

    // --- 長押しピンの管理 ---
    let longPressMarker = null;

    function removeLongPressMarker() {
        longPressMarker?.remove();
        longPressMarker = null;
    }

    registerDrawerCloseHandler(removeLongPressMarker);

    function showDetailDrawerWithPinClear(content, title, subtitle) {
        removeLongPressMarker();
        showDetailDrawer(content, title, subtitle);
    }

    function openCoordinateDrawer(latValue, lngValue) {
        const lat = Number(latValue).toFixed(5);
        const lng = Number(lngValue).toFixed(5);

        removeLongPressMarker();
        longPressMarker = new maplibregl.Marker({ color: 'red' })
            .setLngLat([parseFloat(lng), parseFloat(lat)])
            .addTo(map);

        setDrawerContext({ type: 'coord', lat: parseFloat(lat), lng: parseFloat(lng) });

        const sidebarContent = `
            <div class="mb-3">
                <div style="height:4px; width:100%; background:#60a5fa; border-radius:6px;"></div>
            </div>
            <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                <h3 class="flex items-center justify-between text-xs font-semibold text-blue-600 w-24 min-w-24 text-center mr-2">
                    <i class="fas fa-location-dot fa-fw mr-1 text-blue-500"></i><span class="mx-auto">住所</span>
                </h3>
                <span id="reverse-geocode-address" class="block text-xs text-gray-800 mt-1">取得中...</span></div>
            </div>
            <div class="mb-3 pb-2 border-b border-slate-200 flex items-center">
                <h3 class="flex items-center justify-between text-xs font-semibold text-green-600 w-24 min-w-24 text-center mr-2">
                    <i class="fas fa-map-location-dot fa-fw mr-1 text-green-500"></i><span class="mx-auto">リンク</span>
                </h3>
                <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="text-gray-800 underline text-xs hover:text-gray-900 transition-all">ここをGoogleマップで開く</a>
            </div>
        `;

        showDetailDrawer(sidebarContent, `${lat}, ${lng}`, '座標情報');

        reverseGeocode(lat, lng).then((addr) => {
            const addrElem = document.getElementById('reverse-geocode-address');
            if (addrElem) addrElem.textContent = addr;
        });
    }

    configureDrawerPresenter({
        show: showDetailDrawerWithPinClear,
        hide: hideDetailDrawer,
        openCoordinate: openCoordinateDrawer,
    });

    // PC: 右クリックでコンテキストメニュー
    mapDiv.addEventListener('contextmenu', (e) => {
        if (window.matchMedia('(pointer: coarse)').matches) return;
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, map);
    });

    // モバイル: 長押し（700ms）で座標ドロワーを表示
    const LONG_PRESS_MS = 700;
    const DRAG_THRESHOLD_PX = 10;
    let touchTimeout = null;
    let isDragging = false;
    let touchStartX = 0;
    let touchStartY = 0;

    mapDiv.addEventListener('touchstart', (e) => {
        if (!window.matchMedia('(pointer: coarse)').matches) return;
        if (e.touches.length !== 1) return;
        isDragging = false;
        // iOS の TouchEvent はプールで再利用されるため、コールバック内では
        // e.touches[0] が空になっている。座標をここで変数に退避する。
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchTimeout = setTimeout(() => {
            if (!isDragging) {
                const point = map.unproject([touchStartX, touchStartY]);
                openCoordinateDrawer(point.lat, point.lng);
            }
        }, LONG_PRESS_MS);
    }, { passive: true });

    mapDiv.addEventListener('touchmove', (e) => {
        if (isDragging) return;
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) {
            isDragging = true;
            clearTimeout(touchTimeout);
        }
    }, { passive: true });

    mapDiv.addEventListener('touchend',   () => clearTimeout(touchTimeout), { passive: true });
    mapDiv.addEventListener('touchcancel', () => clearTimeout(touchTimeout), { passive: true });

    // ドロワーを閉じたらピンも削除する
    document.getElementById('detail-drawer-close-btn').addEventListener('click', removeLongPressMarker);
}
