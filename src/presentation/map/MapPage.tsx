/**
 * 地図ページ（index.html）のルートコンポーネント
 *
 * 初期化順序（旧 initializeMap / mapPage と同じ）:
 * 1. 詳細ドロワー・コンテキストメニュー・長押しを地図の load より前に登録（iOS の初回タップ対策）
 * 2. 地図生成 → 縮尺コントロールの直後にハンバーガーメニューを追加
 * 3. load 後に #detail-drawer を表示可能にし、レイヤー → 航路フィルターの順でコントロールを追加
 * 4. 共有URLの対象レイヤーを有効化してドロワーを復元
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RouteFilterViewModel } from '../../application/viewModels/routeFilterViewModel';
import type { LayersConfig } from '../../config/layerConfig';
import { CookieBanner } from '../common/CookieBanner';
import { InfoWindow } from '../common/InfoWindow';
import { LoadingIndicator } from '../common/loadingIndicator';
import { ModalProvider } from '../common/ModalContext';
import { createModalController } from '../common/modalController';
import type { ModalController } from '../common/modalController';
import { PrivacyPolicyWindow } from '../common/PrivacyPolicyWindow';
import { ToastHost } from '../common/toast';
import { ContextMenu } from './ContextMenu';
import type { ContextMenuRequest } from './ContextMenu';
import { DetailDrawer } from './DetailDrawer';
import { HamburgerMenu } from './HamburgerMenu';
import { createLayerSelectionStore, LayerControl } from './LayerControl';
import { useMapServices } from './mapPageServices';
import { bindMapPointerInteractions } from './mapPointerInteractions';
import { RouteFilterControl } from './RouteFilterControl';

interface LoadedControls {
    layersContainer: HTMLElement;
    filterContainer: HTMLElement;
    layers: LayersConfig;
    baseMap: number;
    routeFilterViewModel: RouteFilterViewModel;
}

export function MapPage({ modalController }: { modalController?: ModalController }) {
    const services = useMapServices();
    const modals = useMemo(() => modalController ?? createModalController(), [modalController]);
    const mapRef = useRef<HTMLDivElement | null>(null);
    const layerSelection = useMemo(() => createLayerSelectionStore(), []);
    const [hamburgerContainer, setHamburgerContainer] = useState<HTMLElement | null>(null);
    const [loadedControls, setLoadedControls] = useState<LoadedControls | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuRequest | null>(null);
    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    // #privacy で開いたときはプライバシーポリシーを表示する
    useEffect(() => {
        if (services.initialHash === '#privacy') {
            modals.open('privacy', { focusCloseButton: true });
        }
    }, [services, modals]);

    useEffect(() => {
        const mapElement = mapRef.current;
        if (!mapElement) return undefined;

        let map;
        try {
            map = services.createMap(mapElement);
        } catch (error) {
            // MapLibre 6.7 以降は WebGL2 が使えないと生成時に例外を投げる（旧版は error イベント）。他の UI は動かし続ける
            console.error('Map initialization failed:', error);
            return undefined;
        }
        setHamburgerContainer(map.addControlContainer('hamburger-control'));

        // load より前に登録しないと iOS Safari で初回タップが拾えない
        const unbindPointer = bindMapPointerInteractions(mapElement, {
            onContextMenu: (x, y) => {
                const point = map.unproject(x, y);
                setContextMenu({ x, y, lat: point.lat, lng: point.lng });
            },
            onLongPress: (x, y) => {
                const point = map.unproject(x, y);
                services.openCoordinate(point.lat, point.lng);
            },
        });

        map.onceLoad(() => {
            const { baseMap, enabledLayers } = services.mapViewModel.getState();
            setLoadedControls({
                layersContainer: map.addControlContainer('layers-control'),
                filterContainer: map.addControlContainer('route-filter-control'),
                layers: services.getLayersConfig(enabledLayers),
                baseMap,
                routeFilterViewModel: services.createRouteFilterViewModel(),
            });
            void services.restoreShare((layerId) => layerSelection.markEnabled(layerId));
        });

        services.mapViewModel.initialize();

        return unbindPointer;
    }, [services, layerSelection]);

    return (
        <ModalProvider controller={modals}>
            <LoadingIndicator store={services.loading} />
            <h1>おでかけ航路マップ</h1>
            <div id="map" ref={mapRef}></div>
            <div className="safe-bottom-blocker"></div>

            <InfoWindow buildNumber={services.buildNumber} />

            <DetailDrawer viewModel={services.drawerViewModel} ready={loadedControls !== null} copyShareUrl={services.copyShareUrl} />

            <ContextMenu request={contextMenu} onClose={closeContextMenu} />

            <CookieBanner consent={services.consent} />

            <PrivacyPolicyWindow />

            {hamburgerContainer ? <HamburgerMenu container={hamburgerContainer} /> : null}
            {loadedControls ? (
                <>
                    <LayerControl
                        container={loadedControls.layersContainer}
                        layers={loadedControls.layers}
                        defaultBaseLayer={loadedControls.baseMap}
                        mapViewModel={services.mapViewModel}
                        analytics={services.analytics}
                        externalSelection={layerSelection}
                    />
                    <RouteFilterControl container={loadedControls.filterContainer} viewModel={loadedControls.routeFilterViewModel} />
                </>
            ) : null}
            <ToastHost />
        </ModalProvider>
    );
}
