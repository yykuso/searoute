/**
 * Nominatim API を利用した地名検索・逆ジオコーディングのAdapter
 */
import type { GeocoderFeature, GeocodingService } from '../../application/ports';
import type { FetchLike } from '../http/fetchWithRetry';

export interface GeocodingOptions {
    fetchImpl?: FetchLike;
}

interface NominatimFeature {
    bbox: [number, number, number, number];
    properties: { display_name: string; [key: string]: unknown };
}

/**
 * 地名からGeoJSON Feature候補を検索する（MapLibre Geocoder向け）
 */
export async function forwardGeocode(
    query: string,
    { fetchImpl = globalThis.fetch }: GeocodingOptions = {},
): Promise<{ features: GeocoderFeature[] }> {
    const features: GeocoderFeature[] = [];
    try {
        const request = `https://nominatim.openstreetmap.org/search?q=${query}&format=geojson&polygon_geojson=1&addressdetails=1`;
        const response = await fetchImpl(request);
        const geojson = await response.json() as { features: NominatimFeature[] };
        for (const feature of geojson.features) {
            const center: [number, number] = [
                feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
                feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2
            ];
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: center
                },
                place_name: feature.properties.display_name,
                properties: feature.properties,
                text: feature.properties.display_name,
                place_type: ['place'],
                center
            });
        }
    } catch (e) {
        console.log(`[Error] Failed to forwardGeocode with error: ${e}`);
    }

    return { features };
}

/**
 * 座標から住所文字列を取得する（取得失敗時は固定メッセージ）
 */
export async function reverseGeocode(
    lat: number | string,
    lng: number | string,
    { fetchImpl = globalThis.fetch }: GeocodingOptions = {},
): Promise<string> {
    try {
        const response = await fetchImpl(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ja`);
        const data = await response.json() as { display_name?: string };
        let addr = data.display_name || '住所情報なし';
        if (addr && addr !== '住所情報なし') {
            addr = addr.split(',').map(s => s.trim()).reverse().join(' ');
        }
        return addr;
    } catch {
        return '住所取得失敗';
    }
}

export const nominatimGeocoding: GeocodingService = {
    forwardGeocode: (query) => forwardGeocode(query),
    reverseGeocode: (lat, lng) => reverseGeocode(lat, lng),
};
