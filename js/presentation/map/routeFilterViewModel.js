import {
    cloneDefaultRouteFilters,
    normalizeRouteFilters,
} from '../../domain/routeFilter.js';
import { getCookie } from '../../adapters/persistence/cookieControl.js';

function createInitialState(initialFilters) {
    return {
        filters: normalizeRouteFilters(initialFilters),
    };
}

export function getLegacyRouteFilters({ getCookieImpl = getCookie } = {}) {
    const savedMode = getCookieImpl('routeFilterMode');
    const legacyShowSuspended = getCookieImpl('showSuspendedRoutes') === 'true';
    const filters = cloneDefaultRouteFilters();

    if (legacyShowSuspended) {
        filters.status.suspend = true;
    }

    if (savedMode === 'all') {
        filters.status.suspend = true;
    } else if (savedMode === 'suspend') {
        filters.status.active = false;
        filters.status.season = false;
        filters.status.suspend = true;
    } else if (savedMode === 'car') {
        filters.carriage.car = true;
    } else if (savedMode === 'bike') {
        filters.carriage.bike = true;
    } else if (savedMode === 'bicycle') {
        filters.carriage.bicycle = true;
    }

    return filters;
}

export function getInitialRouteFilters({ getCookieImpl = getCookie, logger = console } = {}) {
    const savedFilters = getCookieImpl('routeFilters');

    if (savedFilters) {
        try {
            return normalizeRouteFilters(JSON.parse(savedFilters));
        } catch (error) {
            logger.warn('failed to parse routeFilters cookie:', error);
        }
    }

    return normalizeRouteFilters(getLegacyRouteFilters({ getCookieImpl }));
}

export function createRouteFilterViewModel({
    initialFilters,
    onApply = () => {},
    onPersist = () => {},
} = {}) {
    const listeners = new Set();
    const state = createInitialState(initialFilters);

    function getState() {
        return {
            filters: normalizeRouteFilters(state.filters),
        };
    }

    function notify() {
        const snapshot = getState();
        listeners.forEach((listener) => listener(snapshot));
    }

    function apply(filters) {
        const normalizedFilters = normalizeRouteFilters(filters);
        state.filters = normalizedFilters;
        onApply(normalizedFilters);
        onPersist(normalizedFilters);
        notify();
        return normalizedFilters;
    }

    function initialize() {
        return apply(state.filters);
    }

    function setFilter(group, key, checked) {
        const nextFilters = {
            ...state.filters,
            [group]: {
                ...state.filters[group],
                [key]: checked,
            },
        };

        return apply(nextFilters);
    }

    function subscribe(listener) {
        listeners.add(listener);
        listener(getState());
        return () => listeners.delete(listener);
    }

    return {
        getState,
        initialize,
        setFilter,
        subscribe,
    };
}