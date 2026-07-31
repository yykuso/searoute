export function setupPmtilesProtocol({ windowRef = window } = {}) {
    windowRef.__searoutePmtilesReady = false;

    if (!windowRef.pmtiles || !windowRef.maplibregl) {
        return;
    }

    try {
        const protocol = new windowRef.pmtiles.Protocol();
        windowRef.maplibregl.addProtocol('pmtiles', protocol.tile);
        windowRef.__searoutePmtilesReady = true;
    } catch (error) {
        console.warn('PMTiles protocol setup failed:', error);
    }
}
