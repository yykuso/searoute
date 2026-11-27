/**
 * 航路詳細ページ（/route/<routeId>/）
 * - ビルド時に renderToString で静的 HTML にする。本文は JS なしで読める（地図だけ後から差し込む）
 * - /route/<id>/ 配下に置くので、リンクはすべて絶対パス（'./' は壊れる）
 */
import type { ReactNode } from 'react';
import { buildRouteMapPath, getRouteInfoFromNote } from '../../domain/route';
import { ROUTE_PAGE_LAYERS, buildRouteDetailPath, getVehicleLabels } from '../../domain/routePage';
import type { RoutePageRecord } from '../../domain/routePage';
import { Icon } from '../common/Icon';
import { SiteHeader } from '../common/SiteHeader';

const VEHICLE_ICONS: Record<string, string> = {
    自動車: 'fas fa-car',
    バイク: 'fas fa-motorcycle',
    自転車: 'fas fa-bicycle',
};

const ROUTE_NOTICE = '航路の線や港の位置は探索を支援するための情報で、実際の運航経路を厳密に示すものではありません。'
    + '最新の運航状況・料金・予約・時刻表は運航事業者の公式サイトで確認してください。';

const BADGE_CLASS = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs';
const SEA_BADGE_CLASS = `${BADGE_CLASS} border-(--rl-sea) bg-(--rl-sea-tint) text-(--rl-sea-ink)`;
const NOTE_BADGE_CLASSES: Record<string, string> = {
    season: `${BADGE_CLASS} border-(--rl-season-bar) bg-(--rl-season-bg) text-slate-800`,
    suspend: `${BADGE_CLASS} border-(--rl-suspend-bar) bg-(--rl-suspend-bg) text-slate-800`,
};

const H2_CLASS = 'mt-6 mb-2 border-l-4 border-(--rl-sea-deep) pl-2 text-[15px] font-bold';

/** 「大きな地図で見る」：既存の共有リンク（'./?share=…'）をルートからの絶対パスにする */
function toAbsoluteMapPath(record: RoutePageRecord): string {
    return `/${buildRouteMapPath(record.routeId, ROUTE_PAGE_LAYERS[record.layer].sourceId).replace(/^\.\//, '')}`;
}

function InfoRows({ record }: { record: RoutePageRecord }) {
    const vehicles = getVehicleLabels(record);
    const rows: Array<{ label: string; value: ReactNode }> = [];
    if (record.businessName) rows.push({ label: '事業者', value: record.businessName });
    if (record.ports.length > 0) {
        rows.push({
            label: '発着港',
            value: (
                <span className="flex flex-wrap items-center gap-1.5">
                    {record.ports.map((port, index) => (
                        <span key={`${port.name}-${index}`} className="contents">
                            {index > 0 && <span>⇄</span>}
                            <span className="rounded-md border border-(--rl-sea-deep) bg-white px-2.5 py-0.5">{port.name}</span>
                        </span>
                    ))}
                </span>
            ),
        });
    }
    if (record.freqInfo) rows.push({ label: '運航頻度', value: record.freqInfo });
    if (record.shipName) rows.push({ label: '船名', value: record.shipName.split(/\s*,\s*/).join('、') });
    if (vehicles.length > 0) rows.push({ label: '車両航送', value: `${vehicles.join('・')} 可` });
    if (record.info) rows.push({ label: '情報', value: record.info });
    if (record.lastChecked) rows.push({ label: '情報確認日', value: record.lastChecked });

    return (
        <dl className="m-0 grid grid-cols-[6.5em_1fr] border-t border-slate-200 min-[601px]:grid-cols-[8em_1fr]">
            {rows.map(({ label, value }) => (
                <div key={label} className="contents">
                    <dt className="border-b border-slate-200 bg-(--rl-sea-tint) px-2 py-2.5 font-semibold text-(--rl-sea-ink)">{label}</dt>
                    <dd className="m-0 border-b border-slate-200 px-2 py-2.5">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

export function RouteDetailPage({ record, related }: { record: RoutePageRecord; related: RoutePageRecord[] }) {
    const layer = ROUTE_PAGE_LAYERS[record.layer];
    const routeName = record.routeName || record.routeId;
    const noteLabel = getRouteInfoFromNote(record.note);
    const vehicles = getVehicleLabels(record);

    return (
        <div className="route-detail-page min-h-screen bg-white text-sm text-slate-800">
            <SiteHeader rootHref="/" current={null} />
            <main className="mx-auto max-w-[960px] px-3 pt-3 pb-10">
                <nav aria-label="パンくずリスト" className="mt-1 mb-3 text-xs text-slate-500">
                    <ol className="flex flex-wrap items-center gap-x-1">
                        <li><a href="/" className="text-(--rl-sea-ink) underline">おでかけ航路マップ</a> ›</li>
                        <li><a href="/routeList" className="text-(--rl-sea-ink) underline">航路一覧</a> ›</li>
                        <li><a href={`/routeList#${layer.anchorId}`} className="text-(--rl-sea-ink) underline">{layer.label}</a> ›</li>
                        <li aria-current="page">{routeName}</li>
                    </ol>
                </nav>

                {record.businessName && (
                    <p className="route-detail-operator m-0 text-[13px] font-semibold text-(--rl-sea-ink)">{record.businessName}</p>
                )}
                <h1 className="mt-0.5 mb-2 text-[19px] leading-snug font-bold min-[601px]:text-[22px]">{routeName}</h1>
                <div className="route-detail-badges mb-3.5 flex flex-wrap gap-1.5">
                    <span className={SEA_BADGE_CLASS}>{layer.label}</span>
                    {noteLabel && record.note && <span className={NOTE_BADGE_CLASSES[record.note]}>{noteLabel}</span>}
                    {vehicles.map((label) => (
                        <span key={label} className={SEA_BADGE_CLASS}>
                            <Icon className={VEHICLE_ICONS[label]} />
                            {label}
                        </span>
                    ))}
                </div>

                <div
                    id="route-detail-map"
                    data-route-id={record.routeId}
                    data-source-layer={record.layer}
                    data-bbox={record.bbox ? JSON.stringify(record.bbox) : undefined}
                    data-ports={JSON.stringify(record.ports)}
                    aria-label="航路の地図"
                    className="h-[260px] w-full overflow-hidden rounded-[10px] border border-(--rl-sea) bg-(--rl-sea-tint) min-[601px]:h-[340px]"
                />

                <div className="mt-3 mb-5 flex flex-wrap gap-2">
                    <a
                        href={toAbsoluteMapPath(record)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-(--rl-sea-ink) px-4 py-2.5 font-semibold text-white no-underline min-[601px]:flex-none"
                    >
                        <Icon className="fas fa-map" />
                        大きな地図で見る
                    </a>
                    {record.url && (
                        <a
                            href={record.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-(--rl-sea-deep) bg-white px-4 py-2.5 font-semibold text-(--rl-sea-ink) no-underline min-[601px]:flex-none"
                        >
                            <Icon className="fas fa-calendar-days" />
                            時刻表（公式サイト）
                        </a>
                    )}
                </div>

                <h2 className={H2_CLASS}>航路の情報</h2>
                <InfoRows record={record} />

                {related.length > 0 && (
                    <>
                        <h2 className={H2_CLASS}>同じ事業者の航路</h2>
                        <ul className="m-0 list-none p-0">
                            {related.map((other) => (
                                <li key={other.routeId}>
                                    <a
                                        href={buildRouteDetailPath(other.routeId)}
                                        className="block border-b border-slate-200 p-2 text-(--rl-sea-ink) no-underline hover:bg-(--rl-sea-tint)"
                                    >
                                        {other.routeName || other.routeId}
                                        {other.businessName && <small className="ml-1.5 text-slate-500">{other.businessName}</small>}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500">{ROUTE_NOTICE}</p>
            </main>
        </div>
    );
}
