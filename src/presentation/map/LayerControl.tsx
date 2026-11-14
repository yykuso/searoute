/**
 * レイヤー切り替えコントロール（#layers-control）
 * - ベースマップ（ラジオ）・オーバーレイ / データレイヤー（チェックボックス）
 * - グループ見出しのクリックで折りたたみ
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { AnalyticsPort } from '../../application/ports';
import type { MapViewModel } from '../../application/viewModels/mapViewModel';
import type { LayersConfig } from '../../config/layerConfig';
import { usePanelToggle } from './touchPanelToggle';

type GroupType = 'base' | 'overlay' | 'geojson';

const GROUP_ORDER: GroupType[] = ['base', 'overlay', 'geojson'];
const GROUP_TITLES: Record<GroupType, string> = {
    base: 'ベースマップ',
    overlay: 'オーバーレイ',
    geojson: 'データレイヤー',
};

interface LayerEntry {
    name?: string;
    id?: number;
    visible?: boolean;
    description?: string;
}

/** 共有URL復元などで外部から有効化されたレイヤー（チェック状態の同期用） */
export interface LayerSelectionStore {
    markEnabled(layerId: string): void;
    getSnapshot(): ReadonlySet<string>;
    subscribe(listener: () => void): () => void;
}

export function createLayerSelectionStore(): LayerSelectionStore {
    let enabled: ReadonlySet<string> = new Set();
    const listeners = new Set<() => void>();
    return {
        markEnabled(layerId) {
            if (!layerId || enabled.has(layerId)) return;
            enabled = new Set([...enabled, layerId]);
            listeners.forEach((listener) => listener());
        },
        getSnapshot: () => enabled,
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
    };
}

export interface LayerControlProps {
    container: HTMLElement;
    layers: LayersConfig;
    defaultBaseLayer: number | null;
    mapViewModel: Pick<MapViewModel, 'changeBaseMap' | 'setLayerEnabled'>;
    analytics: AnalyticsPort;
    externalSelection?: LayerSelectionStore;
}

function getNumericId(layerConfig: LayerEntry | number): number {
    return Number((layerConfig as LayerEntry).id || layerConfig);
}

/** 初期状態（旧 setInitialState と同じ規則でチェック対象を決める） */
function resolveInitialSelection(layers: LayersConfig, defaultBaseLayer: number | null) {
    let baseLayerId: string | null = null;
    // 旧実装（options.defaultBaseLayer || null）と同様に 0（空の地図）は未指定扱いにし、先頭のベースマップを選ぶ
    let baseMap = defaultBaseLayer || null;
    Object.entries(layers.base ?? {}).forEach(([layerId, layerConfig]) => {
        const numericId = getNumericId(layerConfig);
        if (baseMap === null) {
            baseMap = numericId;
            baseLayerId = layerId;
        } else if (numericId === baseMap && baseLayerId === null) {
            baseLayerId = layerId;
        }
    });

    const checked = new Set<string>();
    (['overlay', 'geojson'] as const).forEach((groupType) => {
        Object.entries(layers[groupType] ?? {}).forEach(([layerId, layerConfig]) => {
            if (layerConfig.visible) checked.add(layerId);
        });
    });

    return { baseLayerId, baseMap, checked };
}

const emptySelection: LayerSelectionStore = createLayerSelectionStore();

export function LayerControl({ container, layers, defaultBaseLayer, mapViewModel, analytics, externalSelection = emptySelection }: LayerControlProps) {
    const toggleRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [open] = usePanelToggle(container, toggleRef, panelRef);
    const [initial] = useState(() => resolveInitialSelection(layers, defaultBaseLayer));
    const [baseLayerId, setBaseLayerId] = useState<string | null>(initial.baseLayerId);
    const [checkedLayers, setCheckedLayers] = useState<ReadonlySet<string>>(initial.checked);
    const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<GroupType>>(new Set());
    const externallyEnabled = useSyncExternalStore(externalSelection.subscribe, externalSelection.getSnapshot, externalSelection.getSnapshot);

    // 生成時に初期状態を地図へ反映する（旧実装はコントロール生成時に updateBaseMap / addOverLayer を呼んでいた）
    useEffect(() => {
        if (initial.baseMap !== null && initial.baseLayerId !== null) {
            mapViewModel.changeBaseMap(initial.baseMap);
        }
        initial.checked.forEach((layerId) => { void mapViewModel.setLayerEnabled(layerId, true); });
        // 初回のみ（初期状態は生成時に確定している）
    }, []);

    useEffect(() => {
        if (externallyEnabled.size === 0) return;
        setCheckedLayers((previous) => {
            const missing = [...externallyEnabled].filter((layerId) => !previous.has(layerId));
            return missing.length === 0 ? previous : new Set([...previous, ...missing]);
        });
    }, [externallyEnabled]);

    const handleBaseLayerChange = (layerId: string, layerConfig: LayerEntry) => {
        setBaseLayerId(layerId);
        mapViewModel.changeBaseMap(getNumericId(layerConfig));
        analytics.trackEvent('map_basemap_change', 'map', layerConfig.name || layerId);
    };

    const handleOverlayLayerChange = (layerId: string, layerConfig: LayerEntry, checked: boolean) => {
        setCheckedLayers((previous) => {
            const next = new Set(previous);
            if (checked) next.add(layerId); else next.delete(layerId);
            return next;
        });
        if (checked) {
            void mapViewModel.setLayerEnabled(layerId, true);
            analytics.trackEvent('map_overlayer_change', 'map', layerConfig.name || layerId);
        } else {
            void mapViewModel.setLayerEnabled(layerId, false);
            analytics.trackEvent('map_overlayer_change', 'map', layerConfig.name || layerId, 0);
        }
    };

    const toggleGroupVisibility = (groupType: GroupType) => {
        setCollapsedGroups((previous) => {
            const next = new Set(previous);
            if (next.has(groupType)) next.delete(groupType); else next.add(groupType);
            return next;
        });
    };

    const renderLayerItem = (groupType: GroupType, layerId: string, layerConfig: LayerEntry) => {
        const isBase = groupType === 'base';
        const checked = isBase ? baseLayerId === layerId : checkedLayers.has(layerId);
        const applyChange = (nextChecked: boolean) => {
            if (isBase) {
                if (nextChecked) handleBaseLayerChange(layerId, layerConfig);
            } else {
                handleOverlayLayerChange(layerId, layerConfig, nextChecked);
            }
        };

        // アイテム全体（ラベル含む）のクリックで入力を切り替える
        const handleItemClick = (event: MouseEvent<HTMLDivElement>) => {
            if ((event.target as HTMLElement).tagName === 'INPUT') return;
            applyChange(isBase ? true : !checked);
            event.preventDefault();
        };

        return (
            <div className="layer-item-container" key={layerId}>
                <div className={checked ? 'layer-item checked' : 'layer-item'} onClick={handleItemClick}>
                    <input
                        type={isBase ? 'radio' : 'checkbox'}
                        id={layerId}
                        name={isBase ? 'mapStyle' : groupType}
                        checked={checked}
                        onChange={(event) => applyChange(event.target.checked)}
                    />
                    <label htmlFor={layerId}>{layerConfig.name || layerId}</label>
                    {layerConfig.description ? <div className="layer-tooltip">{layerConfig.description}</div> : null}
                </div>
            </div>
        );
    };

    const groups = GROUP_ORDER.filter((groupType) => layers[groupType] && Object.keys(layers[groupType]).length > 0);

    return createPortal(
        <>
            <div className="maplibregl-ctrl-layers-toggle" ref={toggleRef}>
                <i className="fa-solid fa-layer-group fa-lg"></i>
            </div>
            <div className="maplibregl-ctrl-layers-list" style={{ display: open ? 'block' : 'none' }} ref={panelRef}>
                {groups.map((groupType, index) => {
                    const collapsed = collapsedGroups.has(groupType);
                    return [
                        index > 0 ? <hr key={`${groupType}-hr`} /> : null,
                        <div
                            key={`${groupType}-header`}
                            className={collapsed ? 'layer-group-header collapsed' : 'layer-group-header'}
                            style={{ cursor: 'pointer' }}
                            data-group={groupType}
                            onClick={() => toggleGroupVisibility(groupType)}
                        >
                            {GROUP_TITLES[groupType]}
                        </div>,
                        <div key={`${groupType}-content`} className={collapsed ? 'layer-group-content collapsed' : 'layer-group-content'} data-group={groupType}>
                            {Object.entries(layers[groupType] as Record<string, LayerEntry>).map(([layerId, layerConfig]) => renderLayerItem(groupType, layerId, layerConfig))}
                        </div>,
                    ];
                })}
            </div>
        </>,
        container,
    );
}
