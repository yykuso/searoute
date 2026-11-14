import { mapStyle } from '../../config/mapStyles';

type GetSetting = (name: string) => string | null;

export interface MapViewState {
    status: 'initializing' | 'ready';
    baseMap: number;
    enabledLayers: string[];
}

export interface MapViewModelOptions {
    /** Cookie 値の取得（SettingsStore.get を注入） */
    getCookieImpl?: GetSetting;
    updateBaseMap?: (baseMap: number) => void;
    addOverLayer?: (layerId: string) => Promise<unknown>;
    removeOverLayer?: (layerId: string) => Promise<unknown>;
}

type Listener = (state: MapViewState) => void;

function createInitialState({ getCookieImpl }: { getCookieImpl: GetSetting }): MapViewState {
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
    getCookieImpl = () => null,
    updateBaseMap = () => {},
    addOverLayer = async () => {},
    removeOverLayer = async () => {},
}: MapViewModelOptions = {}) {
    const listeners = new Set<Listener>();
    const state = createInitialState({ getCookieImpl });

    function getState(): MapViewState {
        return {
            ...state,
            enabledLayers: [...state.enabledLayers],
        };
    }

    function notify(): void {
        const snapshot = getState();
        listeners.forEach((listener) => listener(snapshot));
    }

    function initialize(): void {
        updateBaseMap(state.baseMap);
        state.status = 'ready';
        notify();
    }

    function changeBaseMap(nextBaseMap: number): void {
        if (state.baseMap === nextBaseMap) {
            return;
        }

        state.baseMap = nextBaseMap;
        updateBaseMap(nextBaseMap);
        notify();
    }

    async function setLayerEnabled(layerId: string, enabled: boolean): Promise<void> {
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

    function subscribe(listener: Listener): () => boolean {
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

export type MapViewModel = ReturnType<typeof createMapViewModel>;
