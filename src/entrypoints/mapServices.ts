/**
 * 地図ページの依存組み立て（Composition Root）
 * adapters の実装を application のポートへ注入し、presentation の MapPageServices として返す
 * 戻り値は React の Context（MapServicesProvider）経由で UI へ配布する
 */
import { createDrawerUseCases } from '../application/useCases/drawerUseCases';
import { ensureSharedLayerEnabled, copyShareUrl } from '../application/useCases/shareUseCases';
import { restoreSharedRoute } from '../application/useCases/mapUseCases';
import {
    drawerViewModel,
    registerDrawerAction,
    registerDrawerCloseHandler,
} from '../application/viewModels/drawerViewModel';
import { createMapViewModel } from '../application/viewModels/mapViewModel';
import { createMapRouteFilterViewModel } from '../application/viewModels/routeFilterViewModel';
import { createLayersConfig } from '../config/layerConfig';
import { mapStyle } from '../config/mapStyles';
import { googleAnalytics } from '../adapters/analytics/googleAnalyticsAdapter';
import { createCookieConsent } from '../adapters/analytics/googleAnalyticsLoader';
import { browserClipboard, browserNavigation } from '../adapters/browser/browserAdapters';
import { configureLoadingIndicator } from '../adapters/data/dataLoader';
import { wikipediaImageSearch } from '../adapters/data/wikipediaImageAdapter';
import { nominatimGeocoding } from '../adapters/geocoding/nominatimGeocodingAdapter';
import { ContainerControl } from '../adapters/map/controlContainer';
import { focusSharedRoute, portRepository, setPortClickHandler } from '../adapters/map/geoJsonLayerAdapter';
import { isIdInLayer, layerManager } from '../adapters/map/layerManager';
import { addGeocoderControlWhenIdle, createMarkerAdapter, createSearouteMap, mapCamera } from '../adapters/map/mapFactory';
import {
    removeRouteHighlight,
    routeDetailsRepository,
    setRouteClickHandler,
    setRouteFilters,
    zoomToRoute,
    zoomToRouteSection,
} from '../adapters/map/pmtilesLayerAdapter';
import { getCookieSettingsRepository } from '../adapters/persistence/cookieControl';
import { createLoadingIndicator } from '../presentation/common/loadingIndicator';
import type { MapHandle, MapPageServices } from '../presentation/map/mapPageServices';

export function createMapServices({
    buildNumber,
    initialHash = location.hash,
}: { buildNumber: string; initialHash?: string }): MapPageServices {
    const settings = getCookieSettingsRepository();
    const marker = createMarkerAdapter();
    const routeMap = {
        focusSharedRoute,
        zoomToRoute: (params: Parameters<typeof zoomToRoute>[0]) => zoomToRoute(params),
        zoomToRouteSection,
        removeRouteHighlight,
        setRouteFilters,
    };

    const loading = createLoadingIndicator();
    configureLoadingIndicator(loading);

    const drawer = createDrawerUseCases({
        routeDetails: routeDetailsRepository,
        imageSearch: wikipediaImageSearch,
        analytics: googleAnalytics,
        geocoding: nominatimGeocoding,
        routeMap,
        camera: mapCamera,
        marker,
        ports: portRepository,
        navigation: browserNavigation,
    });

    setRouteClickHandler(drawer.selectRoute);
    setPortClickHandler(drawer.selectPort);

    registerDrawerAction('zoom-route', ({ routeId, sourceId }) => {
        void routeMap.zoomToRoute({ routeId, sourceId: sourceId as string });
    });
    registerDrawerAction('zoom-route-section', ({ routeId, lineId, sourceId }) => {
        void routeMap.zoomToRouteSection(routeId as string, lineId as string, sourceId as string);
    });
    registerDrawerCloseHandler(removeRouteHighlight);
    registerDrawerCloseHandler(() => marker.clearPin());

    const mapViewModel = createMapViewModel({
        getCookieImpl: (name) => settings.get(name),
        updateBaseMap: layerManager.updateBaseMap,
        addOverLayer: layerManager.addOverLayer,
        removeOverLayer: layerManager.removeOverLayer,
    });

    return {
        drawerViewModel,
        mapViewModel,
        openCoordinate: (lat, lng) => drawer.openCoordinate(lat, lng),
        analytics: googleAnalytics,
        consent: createCookieConsent(),
        loading,
        buildNumber,
        initialHash,
        createMap(container): MapHandle {
            const map = createSearouteMap({
                container,
                settings,
                onBackgroundClick: drawer.handleBackgroundClick,
            });
            map.on('load', () => addGeocoderControlWhenIdle(nominatimGeocoding));
            return {
                onceLoad: (callback) => { map.once('load', callback); },
                addControlContainer(id) {
                    const control = new ContainerControl(id);
                    map.addControl(control, 'top-right');
                    return control.container;
                },
                unproject: (x, y) => map.unproject([x, y]),
            };
        },
        getLayersConfig: (enabledLayers) => createLayersConfig(mapStyle, enabledLayers, isIdInLayer),
        createRouteFilterViewModel() {
            return createMapRouteFilterViewModel({ settings, applyToMap: setRouteFilters });
        },
        restoreShare(onLayerEnabled) {
            return restoreSharedRoute({
                ensureSharedLayerEnabled: () => ensureSharedLayerEnabled({
                    navigation: browserNavigation,
                    layers: layerManager,
                    onLayerEnabled,
                }),
                initShareFromUrl: drawer.restoreFromUrl,
            });
        },
        copyShareUrl(onCopied, onFallback) {
            return copyShareUrl({
                drawerViewModel,
                navigation: browserNavigation,
                clipboard: browserClipboard,
                onCopied,
                onFallback,
            });
        },
    };
}
