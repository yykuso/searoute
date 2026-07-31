/**
 * 航路フィルター設定 View
 *
 * 責務:
 * - フィルターUI（チェックボックス）と ViewModel の接続
 * - ViewModel 状態の UI 反映
 */
import {
    isDefaultRouteFilters,
    normalizeRouteFilters,
} from '../../domain/routeFilter.js';
import { getCookie, setCookie } from '../../adapters/persistence/cookieControl.js';
import { setRouteFilters } from '../../adapters/map/geoJsonLayerAdapter.js';
import {
    createRouteFilterViewModel,
    getInitialRouteFilters as getInitialRouteFiltersFromViewModel,
    getLegacyRouteFilters as getLegacyRouteFiltersFromViewModel,
} from './routeFilterViewModel.js';

let currentRouteFilters = null;

export function getCurrentRouteFilters() {
    return currentRouteFilters;
}

export function getLegacyRouteFilters({ getCookieImpl = getCookie } = {}) {
    return getLegacyRouteFiltersFromViewModel({ getCookieImpl });
}

export function getInitialRouteFilters({ getCookieImpl = getCookie } = {}) {
    return getInitialRouteFiltersFromViewModel({ getCookieImpl });
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
        initialFilters: getInitialRouteFiltersFromViewModel({ getCookieImpl }),
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