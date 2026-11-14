/**
 * application 層のポート定義
 * 実装は adapters（外部システム）または presentation（UI）が提供し、entrypoints で注入する
 */
import type { RouteRow } from '../domain/route';
import type { RouteFilters } from '../domain/routeFilter';
import type {
    GeoJsonFeature,
    GeoJsonFeatureCollection,
    PortProperties,
    RouteDetails,
    RouteProperties,
} from '../domain/seaRoute';

export type LngLat = [number, number];

/** テンプレート文字列で連結される値（配列はカンマ区切りになる） */
export type SettingValue = string | number | boolean | readonly unknown[];

/** 設定の永続化（Cookie） */
export interface SettingsStore {
    get(name: string): string | null;
    set(name: string, value: SettingValue, days: number): void;
}

/** 航路詳細JSONの取得 */
export interface RouteDetailsRepository {
    loadRouteDetails(routeId: unknown, sourceId: string | null | undefined): Promise<RouteDetails>;
}

/** 航路一覧（lightweight JSON）の取得 */
export interface RouteListRepository {
    loadRouteRows(dataPath: string): Promise<RouteRow[]>;
}

/** 港湾データの取得 */
export interface PortRepository {
    getPorts(): Promise<GeoJsonFeatureCollection<PortProperties>>;
}

export interface GeocoderFeature {
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: LngLat };
    place_name: string;
    properties: Record<string, unknown>;
    text: string;
    place_type: string[];
    center: LngLat;
}

/** 地名検索・逆ジオコーディング */
export interface GeocodingService {
    forwardGeocode(query: string): Promise<{ features: GeocoderFeature[] }>;
    reverseGeocode(lat: number | string, lng: number | string): Promise<string>;
}

export interface ShipImage {
    src: string;
    title: string;
}

/** 船・事業者画像の検索 */
export interface ImageSearchPort {
    findShipImage(shipName: string | null | undefined, businessName: string): Promise<ShipImage | null>;
}

/** アクセス解析 */
export interface AnalyticsPort {
    trackEvent(eventName: string, category: string, label: unknown, value?: number): void;
}

/** ベースマップ・オーバーレイの切り替え */
export interface LayerPort {
    updateBaseMap(baseMap: number): void;
    addOverLayer(layerId: string): Promise<void>;
    removeOverLayer(layerId: string): Promise<void>;
    isLayerActive(layerId: string): boolean;
}

export interface ZoomToRouteParams {
    routeName?: string;
    routeId?: string | number;
    lineId?: string | number;
    sourceId: string;
}

export interface SharedRouteTarget {
    routeId: string | number;
    sourceId: string;
    lat?: number;
    lng?: number;
    zoom?: number;
}

/** 航路レイヤーの地図操作 */
export interface RouteMapPort {
    /** 共有URLの航路へ移動・強調し、該当フィーチャーを返す（なければ空配列） */
    focusSharedRoute(target: SharedRouteTarget): Promise<Array<GeoJsonFeature<RouteProperties>>>;
    zoomToRoute(params: ZoomToRouteParams): Promise<void>;
    zoomToRouteSection(routeId: string | number, lineId: string | number, sourceId: string): Promise<void>;
    removeRouteHighlight(): void;
    setRouteFilters(filters: RouteFilters): void;
}

/** カメラ操作 */
export interface MapCameraPort {
    flyTo(options: { center: LngLat; zoom: number; duration?: number }): void;
}

/** 長押し・右クリック地点のピン */
export interface MarkerPort {
    showPin(lngLat: LngLat): void;
    clearPin(): void;
}

/** 現在URLと履歴 */
export interface NavigationPort {
    getSearch(): string;
    getPathname(): string;
    getHref(): string;
    replaceState(path: string): void;
}

export interface ClipboardPort {
    writeText(text: string): Promise<void>;
}

/** ローディング表示 */
export interface LoadingPort {
    show(): void;
    hide(): void;
}

export interface LoggerPort {
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

/** 地図クリックで航路が選択されたときのイベント */
export interface RouteClickEvent {
    properties: RouteProperties;
    sourceId: string;
    lngLat?: { lat: number; lng: number };
    zoom: number;
}

/** 地図クリックで港湾が選択されたときのイベント */
export interface PortClickEvent {
    properties: PortProperties;
    coordinates: LngLat;
}
