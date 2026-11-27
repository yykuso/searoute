/**
 * 航路一覧ページ（routeList.html）
 * - 国内・国際・韓国国内の3テーブルを ViewModel の状態から描画
 * - キーワード検索で一致しない行を隠し、一致箇所をハイライト
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { RouteListState, RouteListViewModel, RouteTableState } from '../../application/viewModels/routeListViewModel';
import { buildRouteMapPath, createRouteSearchPattern, matchesRouteSearchText } from '../../domain/route';
import type { RouteColumn, RouteRow } from '../../domain/route';
import { useViewModelState } from '../hooks/useViewModelState';
import { Icon } from '../common/Icon';

const SEARCH_HIGHLIGHT_CLASS = 'route-search-highlight';

/** 一致箇所を <span class="route-search-highlight"> で囲む */
function highlightText(text: string, query: string): ReactNode {
    const regex = createRouteSearchPattern(query);
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let match = regex.exec(text);
    while (match) {
        nodes.push(text.slice(lastIndex, match.index));
        nodes.push(<span key={match.index} className={`${SEARCH_HIGHLIGHT_CLASS} rounded-sm bg-yellow-200`}>{match[0]}</span>);
        lastIndex = regex.lastIndex;
        if (match[0] === '') regex.lastIndex++;
        match = regex.exec(text);
    }
    if (lastIndex === 0) return text;
    nodes.push(text.slice(lastIndex));
    return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>);
}

/** 列ごとの見出し（class は旧 HTML のまま。国際・韓国テーブルの情報列は "information"） */
const HEADER_COLUMNS: Array<{ column: RouteColumn; className: string; label: string }> = [
    { column: 'routeId', className: 'route-id', label: '航路ID' },
    { column: 'businessName', className: 'business-name', label: '事業者名' },
    { column: 'routeName', className: 'route-name', label: '航路名' },
    { column: 'info', className: 'info', label: '情報' },
    { column: 'shipName', className: 'ship-name', label: '船名' },
    { column: 'url', className: 'url', label: '時刻表' },
];

const COLUMN_LABELS = Object.fromEntries(HEADER_COLUMNS.map(({ column, label }) => [column, label])) as Record<RouteColumn, string>;

interface CellModel {
    column: RouteColumn;
    text: string;
    href?: string;
    external?: boolean;
}

function toCells(row: RouteRow, visibleColumns: RouteColumn[], sourceId: string): CellModel[] {
    return visibleColumns.map((column) => {
        if (column === 'routeName') {
            return {
                column,
                text: row.routeName || '-',
                href: buildRouteMapPath(row.routeId, sourceId),
            };
        }
        if (column === 'url') {
            return row.url ? { column, text: 'リンク', href: row.url, external: true } : { column, text: '-' };
        }
        return { column, text: row[column] || '-' };
    });
}

function RouteTableRow({ row, visibleColumns, sourceId, query }: {
    row: RouteRow;
    visibleColumns: RouteColumn[];
    sourceId: string;
    query: string;
}) {
    const cells = toCells(row, visibleColumns, sourceId);
    const matchedCells = query ? cells.map((cell) => matchesRouteSearchText(cell.text, query)) : [];
    const hidden = Boolean(query) && !matchedCells.some(Boolean);

    let className: string | undefined;
    if (row.note === 'season') {
        className = 'season-row';
    } else if (row.note === 'suspend') {
        className = 'suspend-row';
    }

    return (
        <tr className={className} style={hidden ? { display: 'none' } : undefined}>
            {cells.map((cell, index) => {
                const content = matchedCells[index] ? highlightText(cell.text, query) : cell.text;
                // data-label はスマホのカード表示で項目名に、data-empty は「-」のセルを隠すのに使う（src/styles/tailwind.css）
                const cellProps = {
                    'data-label': COLUMN_LABELS[cell.column],
                    'data-column': cell.column,
                    'data-empty': !cell.href && cell.text === '-' ? 'true' : undefined,
                };
                if (cell.href) {
                    return (
                        <td key={cell.column} {...cellProps}>
                            {cell.external
                                ? <a href={cell.href} target="_blank" rel="noopener noreferrer">{content}</a>
                                : <a href={cell.href} rel="noopener noreferrer">{content}</a>}
                        </td>
                    );
                }
                return <td key={cell.column} {...cellProps}>{content}</td>;
            })}
        </tr>
    );
}

function RouteTable({ tableClassName, infoClassName, table, query }: {
    tableClassName: string;
    infoClassName: string;
    table: RouteTableState | undefined;
    query: string;
}) {
    return (
        <table className={tableClassName}>
            <thead>
                <tr>
                    {HEADER_COLUMNS.map(({ column, className, label }) => {
                        const visible = !table || table.visibleColumns.includes(column);
                        return (
                            <th key={column} className={column === 'info' ? infoClassName : className} style={table ? { display: visible ? '' : 'none' } : undefined}>{label}</th>
                        );
                    })}
                </tr>
            </thead>
            <tbody>
                {table?.rows.map((row, index) => (
                    <RouteTableRow
                        key={`${row.routeId}-${index}`}
                        row={row}
                        visibleColumns={table.visibleColumns}
                        sourceId={table.sourceId}
                        query={query}
                    />
                ))}
            </tbody>
        </table>
    );
}

/** 表示中の行数。検索語が空なら全行数、あれば一致行数 */
export function countVisibleRows(state: RouteListState): number {
    return state.tables.reduce((total, table) => total + table.rows.filter((row) => (
        !state.query
        || toCells(row, table.visibleColumns, table.sourceId).some((cell) => matchesRouteSearchText(cell.text, state.query))
    )).length, 0);
}

const TABLES = [
    { title: '国内航路', shortLabel: '国内', anchorId: 'domestic', tableClassName: 'sea-route-table', infoClassName: 'info' },
    { title: '国際航路', shortLabel: '国際', anchorId: 'international', tableClassName: 'international-sea-route-table', infoClassName: 'information' },
    { title: '韓国 国内航路', shortLabel: '韓国', anchorId: 'korea', tableClassName: 'sea-route-KR-table', infoClassName: 'information' },
];

const ROUTE_LIST_INTRO = '日本全国のフェリー・旅客船・高速船の航路を、事業者名・航路名・船名で一覧にしています。'
    + '航路名を選ぶと地図上で航路と詳細を、「時刻表」列から運航事業者の公式サイトを確認できます。';

/** 「掲載航路数：国内航路 N件、…」。データが無い（開発サーバーで未取得など）ときは空 */
function routeCountText(tables: RouteTableState[]): string {
    const counts = TABLES.flatMap(({ title, tableClassName }) => {
        const count = tables.find((table) => table.selector === `.${tableClassName} tbody`)?.rows.length ?? 0;
        return count > 0 ? [`${title} ${count}件`] : [];
    });
    return counts.length > 0 ? `掲載航路数：${counts.join('、')}。` : '';
}

export function RouteListPage({ viewModel }: {
    viewModel: Pick<RouteListViewModel, 'getState' | 'subscribe' | 'search' | 'reset'>;
}) {
    const state = useViewModelState(viewModel);
    const [searchText, setSearchText] = useState('');
    const composingRef = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // 検索語が空の状態が通知されたら検索ボックスも空にする（旧 resetRoutesInDocument と同じ）
    useEffect(() => {
        if (!state.query) setSearchText('');
    }, [state]);

    const findTable = (tableClassName: string) => state.tables.find((table) => table.selector === `.${tableClassName} tbody`);
    const visibleCount = state.query ? countVisibleRows(state) : 0;
    // ジャンプ用チップ：データのある表だけ。件数は検索に関係なく全行数
    const jumpTargets = TABLES.flatMap(({ shortLabel, anchorId, tableClassName }) => {
        const count = findTable(tableClassName)?.rows.length ?? 0;
        return count > 0 ? [{ shortLabel, anchorId, count }] : [];
    });
    const searchMessage = state.query && visibleCount === 0 ? '見つかりませんでした。' : '';

    return (
        <div className="route-list-page min-h-screen bg-white text-sm text-slate-800">
            <header className="sticky top-0 z-30 h-(--rl-header-h) bg-(--rl-sea) shadow-sm">
                <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-3">
                    <p className="text-lg font-bold">おでかけ航路マップ</p>
                    <nav>
                        <ul className="flex gap-1">
                            <li>
                                <a href="./" title="マップ" className="flex flex-col items-center rounded-md px-2 py-1 text-xs text-slate-800 hover:bg-white/50">
                                    <Icon className="fas fa-map text-lg" />
                                    <span>マップ</span>
                                </a>
                            </li>
                            <li>
                                <a href="./routeList" title="航路一覧" aria-current="page" className="flex flex-col items-center rounded-md bg-white/60 px-2 py-1 text-xs font-bold text-sky-900">
                                    <Icon className="fas fa-ship text-lg" />
                                    <span>航路一覧</span>
                                </a>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>
            <div className="mx-auto max-w-[1200px] px-3 pb-8">
                <h1 className="mt-4 mb-2 text-xl font-bold sm:text-2xl">フェリー・旅客船 航路一覧</h1>
                <p className="route-list-intro mb-3 max-w-3xl leading-relaxed text-slate-600">
                    {ROUTE_LIST_INTRO}
                    {routeCountText(state.tables)}
                </p>
                <div className="sbox sticky top-(--rl-header-h) z-20 flex h-(--rl-search-h) items-center gap-3 bg-white">
                    <div className="sbox-inner w-full max-w-md">
                        <form role="search" className="relative" onSubmit={(event) => event.preventDefault()}>
                            <input
                                type="search"
                                id="searchbox"
                                ref={inputRef}
                                placeholder="検索キーワードを入力"
                                className="w-full rounded-full border border-slate-300 bg-white py-2 pr-10 pl-4 text-base outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 [&::-webkit-search-cancel-button]:appearance-none"
                                value={searchText}
                                onChange={(event) => {
                                    const { value } = event.target;
                                    setSearchText(value);
                                    if (!composingRef.current) viewModel.search(value);
                                }}
                                onCompositionStart={() => { composingRef.current = true; }}
                                onCompositionEnd={(event) => {
                                    composingRef.current = false;
                                    viewModel.search(event.currentTarget.value);
                                }}
                            />
                            {searchText && (
                                <button
                                    type="button"
                                    aria-label="検索語を消去"
                                    className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                    onClick={() => {
                                        setSearchText('');
                                        viewModel.reset();
                                        inputRef.current?.focus();
                                    }}
                                >✕</button>
                            )}
                        </form>
                    </div>
                    {state.query && visibleCount > 0 && <p aria-live="polite" className="shrink-0 text-slate-600">{visibleCount}件</p>}
                    <p id="search-message" className="shrink-0 text-xs text-red-600">{searchMessage}</p>
                </div>
                {jumpTargets.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <nav aria-label="航路の種類" className="route-jump flex flex-wrap gap-2">
                            {jumpTargets.map(({ shortLabel, anchorId, count }) => (
                                <a key={anchorId} href={`#${anchorId}`} className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-sky-900 hover:bg-sky-100">{shortLabel} {count}件</a>
                            ))}
                        </nav>
                        <p className="route-legend flex gap-3 text-xs text-slate-600">
                            <span className="route-legend-item route-legend-season">季節運航</span>
                            <span className="route-legend-item route-legend-suspend">運休</span>
                        </p>
                    </div>
                )}
                <div className="feedback-callout mb-4 w-fit max-w-full border-l-4 border-sky-500 bg-sky-50 px-3 py-2">
                    <p className="leading-relaxed">
                        データの追加・修正依頼や機能要望は{' '}
                        <a href="https://forms.gle/xXyqvDkZKNwEXPv27" target="_blank" rel="noopener noreferrer" className="font-bold text-sky-700 hover:underline">専用フォーム</a>{' '}
                        から送れます。
                    </p>
                </div>
                {TABLES.map(({ title, anchorId, tableClassName, infoClassName }) => (
                    <Fragment key={tableClassName}>
                        <h2 id={anchorId} className="sticky top-[calc(var(--rl-header-h)+var(--rl-search-h))] z-10 flex h-(--rl-h2-h) scroll-mt-[calc(var(--rl-header-h)+var(--rl-search-h))] items-center bg-white text-lg font-bold">{title}</h2>
                        <RouteTable
                            tableClassName={tableClassName}
                            infoClassName={infoClassName}
                            table={findTable(tableClassName)}
                            query={state.query}
                        />
                    </Fragment>
                ))}
            </div>
        </div>
    );
}
