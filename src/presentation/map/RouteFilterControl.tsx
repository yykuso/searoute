/**
 * 航路フィルターコントロール（#route-filter-control）
 * チェック状態は航路フィルター ViewModel（Cookie 復元・地図適用・永続化）と同期する
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { isRouteFilterActive } from '../../application/viewModels/routeFilterViewModel';
import type { RouteFilterViewModel } from '../../application/viewModels/routeFilterViewModel';
import type { RouteFilterGroup } from '../../domain/routeFilter';
import { useViewModelState } from '../hooks/useViewModelState';
import { usePanelToggle } from './touchPanelToggle';

interface FilterItem {
    group: RouteFilterGroup;
    key: string;
    label: string;
    icon: string;
}

interface FilterSection {
    title: string;
    iconClass: string;
    items: FilterItem[];
}

export const ROUTE_FILTER_SECTIONS: FilterSection[] = [
    {
        title: '航路情報',
        iconClass: 'fa-solid fa-circle-info',
        items: [
            { group: 'status', key: 'active', label: '就航中', icon: 'fa-solid fa-circle-check' },
            { group: 'status', key: 'season', label: '季節運航', icon: 'fa-solid fa-calendar-days' },
            { group: 'status', key: 'suspend', label: '休止中', icon: 'fa-solid fa-ban' },
        ],
    },
    {
        title: '航送可否 (仮)',
        iconClass: 'fa-solid fa-ship',
        items: [
            { group: 'carriage', key: 'car', label: '自動車', icon: 'fa-solid fa-car' },
            { group: 'carriage', key: 'bike', label: 'バイク', icon: 'fa-solid fa-motorcycle' },
            { group: 'carriage', key: 'bicycle', label: '自転車', icon: 'fa-solid fa-bicycle' },
        ],
    },
];

export function RouteFilterControl({ container, viewModel }: { container: HTMLElement; viewModel: RouteFilterViewModel }) {
    const toggleRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [open] = usePanelToggle(container, toggleRef, panelRef);
    const { filters } = useViewModelState(viewModel);

    // 生成時に Cookie から復元したフィルターを地図へ適用・保存する
    useEffect(() => {
        viewModel.initialize();
    }, [viewModel]);

    const isChecked = (item: FilterItem) => Boolean((filters[item.group] as unknown as Record<string, boolean> | undefined)?.[item.key]);

    return createPortal(
        <>
            <button
                type="button"
                className={isRouteFilterActive(filters) ? 'maplibregl-ctrl-filter-toggle route-filter-active' : 'maplibregl-ctrl-filter-toggle'}
                aria-label="航路フィルタ"
                aria-expanded={open}
                ref={toggleRef}
            >
                <i className="fa-solid fa-filter fa-lg"></i>
            </button>
            <div className="maplibregl-ctrl-filter-list" style={{ display: open ? 'block' : 'none' }} ref={panelRef}>
                {ROUTE_FILTER_SECTIONS.map((section, index) => [
                    index > 0 ? <hr key={`${section.title}-hr`} /> : null,
                    <div className="route-filter-section" key={section.title}>
                        <div className="route-filter-section-title">
                            <i className={section.iconClass}></i><span>{section.title}</span>
                        </div>
                        {section.items.map((item) => (
                            <label className="route-filter-item" key={`${item.group}-${item.key}`}>
                                <input
                                    type="checkbox"
                                    data-route-filter-group={item.group}
                                    data-route-filter-key={item.key}
                                    checked={isChecked(item)}
                                    onChange={(event) => viewModel.setFilter(item.group, item.key, event.target.checked)}
                                />
                                <span className="route-filter-item-label"><i className={item.icon}></i><span>{item.label}</span></span>
                            </label>
                        ))}
                    </div>,
                ])}
            </div>
        </>,
        container,
    );
}
