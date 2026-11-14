/**
 * 地図ページの UI が必要とするサービス（presentation 側のポート）
 * 実装は entrypoints が adapters / application を組み合わせて提供し、React Context で注入する
 */
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { AnalyticsPort } from '../../application/ports';
import type { DrawerViewModel } from '../../application/viewModels/drawerViewModel';
import type { MapViewModel } from '../../application/viewModels/mapViewModel';
import type { RouteFilterViewModel } from '../../application/viewModels/routeFilterViewModel';
import type { LayersConfig } from '../../config/layerConfig';
import type { CookieConsentPort } from '../common/CookieBanner';
import type { LoadingIndicatorStore } from '../common/loadingIndicator';

/** 地図インスタンスの UI 向け操作（MapLibre に依存しない） */
export interface MapHandle {
    /** 初期スタイルの読み込み完了時に一度だけ呼ぶ */
    onceLoad(callback: () => void): void;
    /** 右上に空のコントロールコンテナ（.maplibregl-ctrl.maplibregl-ctrl-group）を追加して返す */
    addControlContainer(id: string): HTMLElement;
    /** 画面座標を地図座標へ変換する */
    unproject(x: number, y: number): { lat: number; lng: number };
}

export interface MapPageServices {
    /** 地図を生成する（コンテナ要素の描画後に呼ぶ） */
    createMap(container: HTMLElement): MapHandle;
    drawerViewModel: Pick<DrawerViewModel, 'getState' | 'subscribe'>;
    /** 右クリック・長押し地点の座標ドロワーを開く */
    openCoordinate(lat: number, lng: number): void;
    mapViewModel: Pick<MapViewModel, 'getState' | 'initialize' | 'changeBaseMap' | 'setLayerEnabled'>;
    /** レイヤーコントロールの設定（enabledLayers を初期チェック状態にする） */
    getLayersConfig(enabledLayers: string[]): LayersConfig;
    createRouteFilterViewModel(): RouteFilterViewModel;
    /** 共有URLの対象レイヤーを有効化してからドロワーを復元する */
    restoreShare(onLayerEnabled: (layerId: string) => void): Promise<void>;
    copyShareUrl(onCopied: () => void, onFallback: (url: string) => void): Promise<void>;
    analytics: AnalyticsPort;
    consent: CookieConsentPort;
    loading: LoadingIndicatorStore;
    buildNumber: string;
    /** ページ読み込み時の URL ハッシュ（#privacy でプライバシーポリシーを開く） */
    initialHash: string;
}

const MapServicesContext = createContext<MapPageServices | null>(null);

export function MapServicesProvider({ services, children }: { services: MapPageServices; children: ReactNode }) {
    return <MapServicesContext.Provider value={services}>{children}</MapServicesContext.Provider>;
}

export function useMapServices(): MapPageServices {
    const services = useContext(MapServicesContext);
    if (!services) {
        throw new Error('MapServicesProvider が見つかりません');
    }
    return services;
}
