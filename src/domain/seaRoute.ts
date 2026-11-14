/** 航路フィーチャーのプロパティ（PMTiles / lightweight JSON） */
export interface RouteProperties {
    routeId?: string | number;
    lineId?: string | number;
    routeName?: string;
    businessName?: string;
    portName1?: string;
    portName2?: string;
    color?: string;
    url?: string;
    freqInfo?: string;
    info?: string;
    shipName?: string;
    note?: string | null;
    car?: string | number | null;
    bike?: string | number | null;
    bicycle?: string | number | null;
    [key: string]: unknown;
}

/** 航路ID単位の詳細JSON */
export interface RouteDetails {
    url?: string;
    freqInfo?: string;
    info?: string;
    shipName?: string;
    bbox?: number[];
    [key: string]: unknown;
}

/** 港湾フィーチャーのプロパティ */
export interface PortProperties {
    Name?: string;
    portName?: string;
    info?: string;
    [key: string]: unknown;
}

export interface GeoJsonFeature<P = Record<string, unknown>> {
    type: 'Feature';
    id?: string | number;
    properties: P;
    geometry: { type: string; coordinates: unknown } | null;
}

export interface GeoJsonFeatureCollection<P = Record<string, unknown>> {
    type: 'FeatureCollection';
    features: Array<GeoJsonFeature<P>>;
}

export interface BusinessNameParts {
    primary: string;
    secondary: string;
}

/**
 * 事業者名を主要部分と副要素に分割
 * 例: "会社名（子会社名）" → { primary: '会社名', secondary: '子会社名' }
 */
export function splitBusinessName(value: string | null | undefined): BusinessNameParts {
    const businessName = value || 'N/A';
    if (!businessName.includes('（')) {
        return {
            primary: businessName,
            secondary: '',
        };
    }

    const parts = businessName.split('（');
    return {
        primary: parts[0],
        secondary: (parts[1] || '').replace('）', ''),
    };
}

/** 港湾名（Name / portName）を取得する */
export function getPortName(properties: PortProperties): string {
    return properties.Name || properties.portName || 'N/A';
}

/** 「港」「桟橋」を含まない港湾名には「港」を付けて Google マップ検索 URL を作る */
export function buildPortGoogleMapsUrl(portName: string): string {
    const searchPortName = (portName.includes('港') || portName.includes('桟橋')) ? portName : `${portName}港`;
    return `https://www.google.com/maps/search/${encodeURIComponent(searchPortName)}`;
}

export interface CarriageSummary {
    /** 航送可能な種別のラベル */
    available: string[];
    /** 値が1件以上あり、すべて不可 */
    allUnavailable: boolean;
}

/** 自動車・バイク・自転車の航送可否を集計する */
export function summarizeCarriage(properties: Pick<RouteProperties, 'car' | 'bike' | 'bicycle'>): CarriageSummary {
    const carrierItems: Record<string, unknown> = {
        '自動車': properties.car,
        'バイク': properties.bike,
        '自転車': properties.bicycle,
    };
    const carriageEntries = Object.entries(carrierItems)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([label, value]) => {
            const isAvailable = value === '1' || value === 1;
            return { label, isAvailable };
        });
    return {
        available: carriageEntries.filter(({ isAvailable }) => isAvailable).map(({ label }) => label),
        allUnavailable: carriageEntries.length > 0 && carriageEntries.every(({ isAvailable }) => !isAvailable),
    };
}

/** 座標を小数5桁の文字列に整形する */
export function formatCoordinate(lat: number | string, lng: number | string): { lat: string; lng: string } {
    return {
        lat: Number(lat).toFixed(5),
        lng: Number(lng).toFixed(5),
    };
}
