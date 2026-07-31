export function calculateBounds(features) {
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    features.forEach((feature) => {
        const lines = feature.geometry.type === 'LineString'
            ? [feature.geometry.coordinates]
            : feature.geometry.type === 'MultiLineString'
                ? feature.geometry.coordinates
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