function createInitialState() {
    return {
        drawer: {
            type: null,
            isOpen: false,
        },
        selectedRoute: null,
        coordinate: null,
        context: null,
    };
}

export function createDrawerViewModel() {
    const listeners = new Set();
    const state = createInitialState();

    function getState() {
        return {
            drawer: { ...state.drawer },
            selectedRoute: state.selectedRoute ? { ...state.selectedRoute } : null,
            coordinate: state.coordinate ? { ...state.coordinate } : null,
            context: state.context ? { ...state.context } : null,
        };
    }

    function notify() {
        const snapshot = getState();
        listeners.forEach((listener) => listener(snapshot));
    }

    function setContext(context) {
        state.context = context ? { ...context } : null;
        state.drawer.type = context?.type ?? state.drawer.type;

        if (context?.type === 'route') {
            state.selectedRoute = {
                routeId: context.routeId,
                sourceId: context.sourceId,
            };
            state.coordinate = null;
        } else if (context?.type === 'coord' || context?.type === 'port') {
            state.coordinate = {
                lat: context.lat,
                lng: context.lng,
            };
            state.selectedRoute = null;
        } else {
            state.selectedRoute = null;
            state.coordinate = null;
        }

        notify();
        return getState();
    }

    function open({ type } = {}) {
        if (type) {
            state.drawer.type = type;
        } else if (state.context?.type) {
            state.drawer.type = state.context.type;
        }
        state.drawer.isOpen = true;
        notify();
        return getState();
    }

    function close() {
        state.drawer.isOpen = false;
        notify();
        return getState();
    }

    function subscribe(listener) {
        listeners.add(listener);
        listener(getState());
        return () => listeners.delete(listener);
    }

    return {
        getState,
        setContext,
        open,
        close,
        subscribe,
    };
}

export const drawerViewModel = createDrawerViewModel();