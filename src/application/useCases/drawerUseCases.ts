/**
 * 詳細ドロワーのユースケース
 * - 地図上の航路・港湾・座標の選択
 * - 共有URLからの復元
 * - 背景クリックで閉じる
 */
import {
    buildPortGoogleMapsUrl,
    formatCoordinate,
    getPortName,
    splitBusinessName,
} from '../../domain/seaRoute';
import type { PortProperties, RouteDetails, RouteProperties } from '../../domain/seaRoute';
import type {
    AnalyticsPort,
    GeocodingService,
    ImageSearchPort,
    MapCameraPort,
    MarkerPort,
    NavigationPort,
    PortClickEvent,
    PortRepository,
    RouteClickEvent,
    RouteDetailsRepository,
    RouteMapPort,
} from '../ports';
import {
    drawerViewModel as defaultDrawerViewModel,
    hideDrawer,
    showDrawer,
    updateDrawerBody,
} from '../viewModels/drawerViewModel';
import type { DrawerBody, DrawerViewModel } from '../viewModels/drawerViewModel';
import { restoreDrawerFromUrl } from './shareUseCases';

export interface DrawerUseCaseDeps {
    routeDetails: RouteDetailsRepository;
    imageSearch: ImageSearchPort;
    analytics: AnalyticsPort;
    geocoding: Pick<GeocodingService, 'reverseGeocode'>;
    routeMap: Pick<RouteMapPort, 'focusSharedRoute' | 'removeRouteHighlight'>;
    camera: MapCameraPort;
    marker: MarkerPort;
    ports: PortRepository;
    navigation: NavigationPort;
    drawerViewModel?: Pick<DrawerViewModel, 'setContext'>;
}

export function createDrawerUseCases(deps: DrawerUseCaseDeps) {
    const {
        routeDetails,
        imageSearch,
        analytics,
        geocoding,
        routeMap,
        camera,
        marker,
        ports,
        navigation,
        drawerViewModel = defaultDrawerViewModel,
    } = deps;

    /** 航路・港湾ドロワー表示時は長押しピンを消す */
    function showDrawerWithPinClear(body: DrawerBody, title: string, subtitle?: string): void {
        marker.clearPin();
        showDrawer(body, title, subtitle);
    }

    /** 船名・事業者名から画像を探して表示中の航路ドロワーへ反映する */
    async function loadShipImage(body: DrawerBody, shipName: string | null, businessName: string): Promise<void> {
        if (!shipName) return;
        try {
            const image = await imageSearch.findShipImage(shipName, businessName);
            if (image) {
                updateDrawerBody(body, { shipImage: image });
            }
        } catch {
            // 失敗時は何も表示しない
        }
    }

    function showRoute(properties: RouteProperties, details: RouteDetails, sourceId: string): void {
        const businessNameParts = splitBusinessName(properties.businessName);
        const body: DrawerBody = { kind: 'route', properties, details, sourceId, shipImage: null };
        showDrawerWithPinClear(body, businessNameParts.primary, businessNameParts.secondary);
        void loadShipImage(body, details.shipName || properties.shipName || null, properties.businessName || '');
    }

    function showPort(properties: PortProperties, portName: string): void {
        const body: DrawerBody = { kind: 'port', properties, googleMapsUrl: buildPortGoogleMapsUrl(portName) };
        showDrawerWithPinClear(body, portName, '港湾情報');
    }

    /** 地図上の航路クリック */
    async function selectRoute(event: RouteClickEvent): Promise<void> {
        const { properties, sourceId } = event;
        const details = await routeDetails.loadRouteDetails(properties.routeId, sourceId);

        drawerViewModel.setContext({
            type: 'route',
            routeId: properties.routeId as string | number,
            sourceId,
            lat: event.lngLat?.lat,
            lng: event.lngLat?.lng,
            zoom: event.zoom,
        });
        showRoute(properties, details, sourceId);
        analytics.trackEvent('marker_click', 'map', properties.businessName);
    }

    /** 地図上の港湾クリック */
    function selectPort(event: PortClickEvent): void {
        const portName = getPortName(event.properties);
        const [lng, lat] = event.coordinates;
        drawerViewModel.setContext({ type: 'port', lat, lng, name: portName });
        showPort(event.properties, portName);
    }

    /** 右クリック・長押し地点の座標ドロワー */
    function openCoordinate(latValue: number | string, lngValue: number | string): void {
        const { lat, lng } = formatCoordinate(latValue, lngValue);

        marker.clearPin();
        marker.showPin([parseFloat(lng), parseFloat(lat)]);

        drawerViewModel.setContext({ type: 'coord', lat: parseFloat(lat), lng: parseFloat(lng) });

        const body: DrawerBody = { kind: 'coord', lat, lng, address: '取得中...' };
        showDrawer(body, `${lat}, ${lng}`, '座標情報');

        void geocoding.reverseGeocode(lat, lng).then((address) => {
            updateDrawerBody(body, { address });
        });
    }

    /** 何もない場所のクリック */
    function handleBackgroundClick(): void {
        hideDrawer();
        routeMap.removeRouteHighlight();
    }

    /** URLクエリから航路/港湾/座標のドロワーを復元する */
    async function restoreFromUrl(): Promise<void> {
        await restoreDrawerFromUrl({
            route: async (routeId: string, sourceId: string, lat?: number, lng?: number, zoom?: number) => {
                const normalizedRouteId = isNaN(routeId as unknown as number) ? routeId : Number(routeId);
                const matchingFeatures = await routeMap.focusSharedRoute({
                    routeId: normalizedRouteId,
                    sourceId,
                    lat,
                    lng,
                    zoom,
                });

                const feature = matchingFeatures[0];
                if (!feature) return false;

                const details = await routeDetails.loadRouteDetails(normalizedRouteId, sourceId);
                drawerViewModel.setContext({
                    type: 'route',
                    routeId,
                    sourceId,
                    lat: !isNaN(lat as number) ? lat : undefined,
                    lng: !isNaN(lng as number) ? lng : undefined,
                    zoom: !isNaN(zoom as number) ? zoom : undefined,
                });
                showRoute(feature.properties, details, sourceId);
                return true;
            },
            port: async (lat: number, lng: number, name: string) => {
                camera.flyTo({ center: [lng, lat], zoom: 12, duration: 1000 });
                const portData = await ports.getPorts();
                const feature = portData?.features.find(f =>
                    (f.properties.Name || f.properties.portName) === name
                );
                const properties: PortProperties = feature?.properties ?? { Name: name };
                drawerViewModel.setContext({ type: 'port', lat, lng, name });
                showPort(properties, name);
                return true;
            },
            coord: async (lat: number, lng: number) => {
                camera.flyTo({ center: [lng, lat], zoom: 14, duration: 1000 });
                openCoordinate(lat, lng);
                return true;
            },
        }, navigation);
    }

    return {
        selectRoute,
        selectPort,
        openCoordinate,
        handleBackgroundClick,
        restoreFromUrl,
    };
}

export type DrawerUseCases = ReturnType<typeof createDrawerUseCases>;
