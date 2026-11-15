import type { Map as MapLibreMap } from 'maplibre-gl';

// setMap() 前は null。既存コードと同様に初期化後のみ参照する前提で非 null 型として公開する
export let map: MapLibreMap = null as unknown as MapLibreMap;

export function setMap(mapInstance: MapLibreMap | null): void {
    map = mapInstance as MapLibreMap;
}
