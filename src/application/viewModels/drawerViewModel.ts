import type { ShareContext, ShareType } from '../../domain/shareContext';
import type { PortProperties, RouteDetails, RouteProperties } from '../../domain/seaRoute';
import type { ShipImage } from '../ports';

/** ドロワー本文の表示モデル（HTML/JSX への変換は presentation が行う） */
export type DrawerBody =
    | {
        kind: 'route';
        properties: RouteProperties;
        details: RouteDetails;
        sourceId: string;
        shipImage: ShipImage | null;
    }
    | {
        kind: 'port';
        properties: PortProperties;
        googleMapsUrl: string;
    }
    | {
        kind: 'coord';
        lat: string;
        lng: string;
        address: string;
    };

export interface DrawerContent<TBody = DrawerBody> {
    body: TBody;
    title: string;
    subtitle?: string;
}

export interface DrawerState {
    drawer: {
        type: ShareType | null;
        isOpen: boolean;
    };
    selectedRoute: { routeId: string | number; sourceId: string } | null;
    coordinate: { lat: number; lng: number } | null;
    context: ShareContext | null;
    content: DrawerContent | null;
}

type Listener = (state: DrawerState) => void;

function createInitialState(): DrawerState {
    return {
        drawer: {
            type: null,
            isOpen: false,
        },
        selectedRoute: null,
        coordinate: null,
        context: null,
        content: null,
    };
}

export function createDrawerViewModel() {
    const listeners = new Set<Listener>();
    const state = createInitialState();

    function getState(): DrawerState {
        return {
            drawer: { ...state.drawer },
            selectedRoute: state.selectedRoute ? { ...state.selectedRoute } : null,
            coordinate: state.coordinate ? { ...state.coordinate } : null,
            context: state.context ? { ...state.context } : null,
            content: state.content,
        };
    }

    function notify(): void {
        const snapshot = getState();
        listeners.forEach((listener) => listener(snapshot));
    }

    function setContext(context: ShareContext | null | undefined): DrawerState {
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

    function setContent(content: DrawerContent | null): DrawerState {
        state.content = content;
        notify();
        return getState();
    }

    /** 表示中の本文を部分更新する（非同期で取得した画像・住所の反映用）。本文が差し替わっていれば無視する */
    function updateBody(target: DrawerBody, patch: Partial<DrawerBody>): boolean {
        if (!state.content || state.content.body !== target) {
            return false;
        }
        state.content = { ...state.content, body: { ...target, ...patch } as DrawerBody };
        notify();
        return true;
    }

    function open({ type }: { type?: ShareType } = {}): DrawerState {
        if (type) {
            state.drawer.type = type;
        } else if (state.context?.type) {
            state.drawer.type = state.context.type;
        }
        state.drawer.isOpen = true;
        notify();
        return getState();
    }

    function close(): DrawerState {
        state.drawer.isOpen = false;
        notify();
        return getState();
    }

    function subscribe(listener: Listener): () => boolean {
        listeners.add(listener);
        listener(getState());
        return () => listeners.delete(listener);
    }

    return {
        getState,
        setContext,
        setContent,
        updateBody,
        open,
        close,
        subscribe,
    };
}

export type DrawerViewModel = ReturnType<typeof createDrawerViewModel>;

export const drawerViewModel = createDrawerViewModel();

// --- drawerPresenter ---
// 命令的な描画が必要な場合のフック（React 化後は drawerViewModel の購読で描画できる）

export interface DrawerPresenter {
    show: (content: DrawerBody, title?: string, subtitle?: string) => boolean;
    hide: () => boolean;
    openCoordinate: (lat: number, lng: number) => boolean;
    /** 表示中本文の部分更新（船画像・住所） */
    update: (body: DrawerBody) => boolean;
}

const defaultPresenter: DrawerPresenter = {
    show: () => false,
    hide: () => false,
    openCoordinate: () => false,
    update: () => false,
};

let presenter: DrawerPresenter = { ...defaultPresenter };

export function configureDrawerPresenter(overrides: Partial<DrawerPresenter> = {}): void {
    presenter = { ...defaultPresenter, ...overrides };
}

export function showDrawer(content: DrawerBody, title?: string, subtitle?: string): boolean {
    drawerViewModel.setContent({ body: content, title: title as string, subtitle });
    const result = presenter.show(content, title, subtitle);
    drawerViewModel.open();
    return result;
}

export function updateDrawerBody(target: DrawerBody, patch: Partial<DrawerBody>): boolean {
    if (!drawerViewModel.updateBody(target, patch)) {
        return false;
    }
    return presenter.update(drawerViewModel.getState().content!.body);
}

export function hideDrawer(): boolean {
    const result = presenter.hide();
    drawerViewModel.close();
    return result;
}

export function openCoordinateDrawer(lat: number, lng: number): boolean {
    const result = presenter.openCoordinate(lat, lng);
    drawerViewModel.open({ type: 'coord' });
    return result;
}

// --- drawerActionRegistry ---

export type DrawerActionPayload = Record<string, string | undefined>;
type DrawerActionHandler = (payload: DrawerActionPayload) => void;

const handlers = new Map<string, DrawerActionHandler>();
const closeHandlers = new Set<() => void>();

export function registerDrawerAction(action: string, handler: DrawerActionHandler): () => boolean {
    handlers.set(action, handler);
    return () => handlers.delete(action);
}

export function executeDrawerAction(action: string, payload: DrawerActionPayload = {}): boolean {
    const handler = handlers.get(action);
    if (!handler) return false;
    handler(payload);
    return true;
}

export function registerDrawerCloseHandler(handler: () => void): () => boolean {
    closeHandlers.add(handler);
    return () => closeHandlers.delete(handler);
}

export function executeDrawerCloseHandlers(): void {
    closeHandlers.forEach(handler => handler());
}
