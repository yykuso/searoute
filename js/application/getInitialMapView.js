const DEFAULT_CENTER = [136.2923, 35.3622];
const DEFAULT_ZOOM = 5;

export function getInitialMapView(settingsRepository) {
    const savedCenter = settingsRepository.get('mapCenter');
    const savedZoom = settingsRepository.get('mapZoom');
    const center = savedCenter ? JSON.parse(savedCenter) : [...DEFAULT_CENTER];
    const zoom = savedZoom ? parseFloat(savedZoom) : DEFAULT_ZOOM;

    return [center, zoom];
}