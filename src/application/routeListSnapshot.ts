import type { RouteTableState } from './viewModels/routeListViewModel';

export const ROUTE_LIST_SNAPSHOT_ID = 'route-list-data';

/** ビルド時に HTML へ埋め込む航路一覧データの script タグを返す */
export function serializeRouteListSnapshot(tables: RouteTableState[]): string {
    const json = JSON.stringify(tables).replace(/</g, '\\u003c');
    return `<script type="application/json" id="${ROUTE_LIST_SNAPSHOT_ID}">${json}</script>`;
}

/** 埋め込みデータを読み戻す。空・不正・配列でない場合は null */
export function parseRouteListSnapshot(text: string | null | undefined): RouteTableState[] | null {
    if (!text) return null;
    try {
        const value: unknown = JSON.parse(text);
        return Array.isArray(value) ? (value as RouteTableState[]) : null;
    } catch {
        return null;
    }
}
