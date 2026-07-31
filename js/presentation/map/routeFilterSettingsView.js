/**
 * 航路フィルター設定 View
 *
 * 責務:
 * - フィルターUI（チェックボックス）と ViewModel の接続
 * - ViewModel 状態の UI 反映
 */
import {
    cloneDefaultRouteFilters,
    isDefaultRouteFilters,
    normalizeRouteFilters,
} from '../../domain/routeFilter.js';
import { getCookie, setCookie } from '../../adapters/persistence/cookieControl.js';
import { setRouteFilters } from '../../adapters/map/geoJsonLayerAdapter.js';

let currentRouteFilters = null;

function createInitialState(initialFilters) {
    return {
        filters: normalizeRouteFilters(initialFilters),
    };
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

export function getCurrentRouteFilters() {
    return currentRouteFilters;
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

export function syncRouteFilterInputs(documentRef, filters) {
    documentRef.querySelectorAll('[data-route-filter-group][data-route-filter-key]').forEach((input) => {
        const { routeFilterGroup, routeFilterKey } = input.dataset;
        input.checked = Boolean(filters?.[routeFilterGroup]?.[routeFilterKey]);
    });
}

export function updateRouteFilterToggleState(documentRef, filters) {
    const filterToggle = documentRef.querySelector('.maplibregl-ctrl-filter-toggle');
    if (!filterToggle) {
        return;
    }

    filterToggle.classList.toggle('route-filter-active', !isDefaultRouteFilters(filters));
}

export function applyRouteFilterState(documentRef, filters, { setCookieImpl = setCookie } = {}) {
    const normalizedFilters = normalizeRouteFilters(filters);
    currentRouteFilters = normalizedFilters;
    syncRouteFilterInputs(documentRef, normalizedFilters);
    setRouteFilters(normalizedFilters);
    updateRouteFilterToggleState(documentRef, normalizedFilters);
    setCookieImpl('routeFilters', encodeURIComponent(JSON.stringify(normalizedFilters)), 365);
    setCookieImpl('showSuspendedRoutes', normalizedFilters.status.suspend.toString(), 365);
    return normalizedFilters;
}

export function initRouteFilterSettings({ documentRef = document, getCookieImpl = getCookie, setCookieImpl = setCookie } = {}) {
    const filterInputs = documentRef.querySelectorAll('[data-route-filter-group][data-route-filter-key]');

    if (filterInputs.length === 0) {
        console.warn('route filter inputs not found');
        return false;
    }

    const viewModel = createRouteFilterViewModel({
        initialFilters: getInitialRouteFilters({ getCookieImpl }),
        onApply: (filters) => {
            currentRouteFilters = filters;
            syncRouteFilterInputs(documentRef, filters);
            setRouteFilters(filters);
            updateRouteFilterToggleState(documentRef, filters);
        },
        onPersist: (filters) => {
            setCookieImpl('routeFilters', encodeURIComponent(JSON.stringify(filters)), 365);
            setCookieImpl('showSuspendedRoutes', filters.status.suspend.toString(), 365);
        },
    });

    viewModel.initialize();

    filterInputs.forEach((input) => {
        if (input.dataset.routeFilterBound === 'true') {
            return;
        }

        input.dataset.routeFilterBound = 'true';
        input.addEventListener('change', (event) => {
            const { routeFilterGroup, routeFilterKey } = event.target.dataset;
            if (!routeFilterGroup || !routeFilterKey) {
                return;
            }

            viewModel.setFilter(routeFilterGroup, routeFilterKey, event.target.checked);
        });
    });

    return true;
}