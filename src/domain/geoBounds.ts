export interface GeoBounds {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
}

export type LngLatTuple = [number, number] | number[];

export interface LineFeatureLike {
    geometry: {
        type: string;
        coordinates: unknown;
    };
}

export function boundsFromBbox(bbox: unknown): GeoBounds | null {
    if (!Array.isArray(bbox) || bbox.length !== 4 || !bbox.every(Number.isFinite)) {
        return null;
    }

    const [minLng, minLat, maxLng, maxLat] = bbox as [number, number, number, number];
    const isValid = minLng >= -180 && maxLng <= 180
        && minLat >= -90 && maxLat <= 90
        && minLng <= maxLng && minLat <= maxLat;

    return isValid ? { minLng, minLat, maxLng, maxLat } : null;
}

export function calculateBounds(features: LineFeatureLike[]): GeoBounds | null {
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    features.forEach((feature) => {
        const lines: LngLatTuple[][] = feature.geometry.type === 'LineString'
            ? [feature.geometry.coordinates as LngLatTuple[]]
            : feature.geometry.type === 'MultiLineString'
                ? feature.geometry.coordinates as LngLatTuple[][]
                : [];

        lines.forEach((line) => line.forEach(([lng, lat]) => {
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
        }));
    });

    const isValid = minLng !== Infinity && minLat !== Infinity && maxLng !== -Infinity && maxLat !== -Infinity;
    return isValid ? { minLng, maxLng, minLat, maxLat } : null;
}
