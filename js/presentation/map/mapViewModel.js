import { getCookie } from '../../adapters/persistence/cookieControl.js';
import { mapStyle } from '../../config/mapStyles.js';

function createInitialState({ getCookieImpl = getCookie } = {}) {
    const savedMap = getCookieImpl('currentMap');
    const savedLayers = getCookieImpl('currentLayer');

    const baseMap = savedMap ? parseInt(savedMap, 10) : mapStyle.EMPTY_MAP;
    const enabledLayers = savedLayers ? savedLayers.split(',') : ['geojson_sea_route'];

    return {
        status: 'initializing',
        baseMap,
        enabledLayers,
    };
}

export function createMapViewModel({
    getCookieImpl = getCookie,
    updateBaseMap = () => {},
    addOverLayer = async () => {},
    removeOverLayer = async () => {},
} = {}) {
    const listeners = new Set();
    const state = createInitialState({ getCookieImpl });

    function getState() {
        return {
            ...state,
            enabledLayers: [...state.enabledLayers],
        };
    }

    function notify() {
        const snapshot = getState();
        listeners.forEach((listener) => listener(snapshot));
    }

    function initialize() {
        updateBaseMap(state.baseMap);
        state.status = 'ready';
        notify();
    }

    function changeBaseMap(nextBaseMap) {
        if (state.baseMap === nextBaseMap) {
            return;
        }

        state.baseMap = nextBaseMap;
        updateBaseMap(nextBaseMap);
        notify();
    }

    async function setLayerEnabled(layerId, enabled) {
        const isEnabled = state.enabledLayers.includes(layerId);

        if (enabled) {
            await addOverLayer(layerId);
            if (!isEnabled) {
                state.enabledLayers = [...state.enabledLayers, layerId];
            }
            notify();
            return;
        }

        if (!enabled && isEnabled) {
            await removeOverLayer(layerId);
            state.enabledLayers = state.enabledLayers.filter((id) => id !== layerId);
            notify();
        }
    }

    function subscribe(listener) {
        listeners.add(listener);
        listener(getState());
        return () => listeners.delete(listener);
    }

    return {
        getState,
        initialize,
        changeBaseMap,
        setLayerEnabled,
        subscribe,
    };
}