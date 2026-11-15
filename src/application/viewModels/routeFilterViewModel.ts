/**
 * 航路フィルター ViewModel
 * - 状態の正規化・適用・永続化コールバック
 * - Cookie（routeFilters / 旧 routeFilterMode・showSuspendedRoutes）からの初期値復元
 */
import {
    cloneDefaultRouteFilters,
    isDefaultRouteFilters,
    normalizeRouteFilters,
} from '../../domain/routeFilter';
import type { RouteFilterGroup, RouteFilters, RouteFiltersInput } from '../../domain/routeFilter';
import type { LoggerPort, SettingsStore } from '../ports';

type GetSetting = (name: string) => string | null;
type FiltersInput = RouteFiltersInput | RouteFilters;

export interface RouteFilterState {
    filters: RouteFilters;
}

export interface RouteFilterViewModelOptions {
    initialFilters?: FiltersInput;
    onApply?: (filters: RouteFilters) => void;
    onPersist?: (filters: RouteFilters) => void;
}

type Listener = (state: RouteFilterState) => void;

function createInitialState(initialFilters: FiltersInput): RouteFilterState {
    return {
        filters: normalizeRouteFilters(initialFilters),
    };
}

export function createRouteFilterViewModel({
    initialFilters,
    onApply = () => {},
    onPersist = () => {},
}: RouteFilterViewModelOptions = {}) {
    const listeners = new Set<Listener>();
    const state = createInitialState(initialFilters);

    function getState(): RouteFilterState {
        return {
            filters: normalizeRouteFilters(state.filters),
        };
    }

    function notify(): void {
        const snapshot = getState();
        listeners.forEach((listener) => listener(snapshot));
    }

    function apply(filters: FiltersInput): RouteFilters {
        const normalizedFilters = normalizeRouteFilters(filters);
        state.filters = normalizedFilters;
        onApply(normalizedFilters);
        onPersist(normalizedFilters);
        notify();
        return normalizedFilters;
    }

    function initialize(): RouteFilters {
        return apply(state.filters);
    }

    function setFilter(group: RouteFilterGroup, key: string, checked: boolean): RouteFilters {
        const nextFilters = {
            ...state.filters,
            [group]: {
                ...state.filters[group],
                [key]: checked,
            },
        };

        return apply(nextFilters as RouteFilters);
    }

    function subscribe(listener: Listener): () => boolean {
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

export type RouteFilterViewModel = ReturnType<typeof createRouteFilterViewModel>;

export function getLegacyRouteFilters({ getCookieImpl }: { getCookieImpl: GetSetting }): RouteFilters {
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

export function getInitialRouteFilters({
    getCookieImpl,
    logger = console,
}: { getCookieImpl: GetSetting; logger?: Pick<LoggerPort, 'warn'> }): RouteFilters {
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

/** フィルターを Cookie へ保存する（routeFilters と旧キー showSuspendedRoutes） */
export function persistRouteFilters(settings: Pick<SettingsStore, 'set'>, filters: RouteFilters): void {
    settings.set('routeFilters', encodeURIComponent(JSON.stringify(filters)), 365);
    settings.set('showSuspendedRoutes', filters.status.suspend.toString(), 365);
}

/** フィルタートグルを強調表示するか（既定値以外が選択されているか） */
export function isRouteFilterActive(filters: FiltersInput): boolean {
    return !isDefaultRouteFilters(filters);
}

/**
 * 地図画面のフィルター ViewModel を生成する（Cookie 復元・地図適用・永続化を接続）
 * onChange で UI 側（チェック状態・トグル強調）を同期する
 */
export function createMapRouteFilterViewModel({
    settings,
    applyToMap,
    onChange = () => {},
    logger = console,
}: {
    settings: SettingsStore;
    applyToMap: (filters: RouteFilters) => void;
    onChange?: (filters: RouteFilters) => void;
    logger?: Pick<LoggerPort, 'warn'>;
}): RouteFilterViewModel {
    return createRouteFilterViewModel({
        initialFilters: getInitialRouteFilters({ getCookieImpl: (name) => settings.get(name), logger }),
        onApply: (filters) => {
            onChange(filters);
            applyToMap(filters);
        },
        onPersist: (filters) => persistRouteFilters(settings, filters),
    });
}
