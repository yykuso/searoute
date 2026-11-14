/**
 * 航路一覧ページ（routeList.html）
 * - 国内・国際・韓国国内の3テーブルを ViewModel の状態から描画
 * - キーワード検索で一致しない行を隠し、一致箇所をハイライト
 */
import { Fragment, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { RouteListState, RouteListViewModel, RouteTableState } from '../../application/viewModels/routeListViewModel';
import { createRouteSearchPattern, matchesRouteSearchText } from '../../domain/route';
import type { RouteColumn, RouteRow } from '../../domain/route';
import { useViewModelState } from '../hooks/useViewModelState';

const SEARCH_HIGHLIGHT_CLASS = 'route-search-highlight';

export function buildRouteMapUrl(routeId: string, sourceId: string, { locationRef = window.location }: { locationRef?: Pick<Location, 'href'> } = {}): string {
    const url = new URL('./index.html', locationRef.href);
    url.searchParams.set('share', 'route');
    url.searchParams.set('routeId', routeId);
    url.searchParams.set('sourceId', sourceId);
    return url.toString();
}

/** 一致箇所を <span class="route-search-highlight"> で囲む */
function highlightText(text: string, query: string): ReactNode {
    const regex = createRouteSearchPattern(query);
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let match = regex.exec(text);
    while (match) {
        nodes.push(text.slice(lastIndex, match.index));
        nodes.push(<span key={match.index} className={SEARCH_HIGHLIGHT_CLASS} style={{ backgroundColor: '#ffe46f' }}>{match[0]}</span>);
        lastIndex = regex.lastIndex;
        if (match[0] === '') regex.lastIndex++;
        match = regex.exec(text);
    }
    if (lastIndex === 0) return text;
    nodes.push(text.slice(lastIndex));
    return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>);
}

interface CellModel {
    column: RouteColumn;
    text: string;
    href?: string;
    external?: boolean;
}

function toCells(row: RouteRow, visibleColumns: RouteColumn[], sourceId: string, locationRef?: Pick<Location, 'href'>): CellModel[] {
    return visibleColumns.map((column) => {
        if (column === 'routeName') {
            return {
                column,
                text: row.routeName || '-',
                href: buildRouteMapUrl(row.routeId, sourceId, locationRef ? { locationRef } : {}),
            };
        }
        if (column === 'url') {
            return row.url ? { column, text: 'リンク', href: row.url, external: true } : { column, text: '-' };
        }
        return { column, text: row[column] || '-' };
    });
}

function RouteTableRow({ row, visibleColumns, sourceId, query, locationRef }: {
    row: RouteRow;
    visibleColumns: RouteColumn[];
    sourceId: string;
    query: string;
    locationRef?: Pick<Location, 'href'>;
}) {
    const cells = toCells(row, visibleColumns, sourceId, locationRef);
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
                if (cell.href) {
                    return (
                        <td key={cell.column}>
                            {cell.external
                                ? <a href={cell.href} target="_blank" rel="noopener noreferrer">{content}</a>
                                : <a href={cell.href} rel="noopener noreferrer">{content}</a>}
                        </td>
                    );
                }
                return <td key={cell.column}>{content}</td>;
            })}
        </tr>
    );
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

function RouteTable({ tableClassName, infoClassName, table, query, locationRef }: {
    tableClassName: string;
    infoClassName: string;
    table: RouteTableState | undefined;
    query: string;
    locationRef?: Pick<Location, 'href'>;
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
                        locationRef={locationRef}
                    />
                ))}
            </tbody>
        </table>
    );
}

function hasVisibleRow(state: RouteListState, locationRef?: Pick<Location, 'href'>): boolean {
    return state.tables.some((table) => table.rows.some((row) => (
        toCells(row, table.visibleColumns, table.sourceId, locationRef).some((cell) => matchesRouteSearchText(cell.text, state.query))
    )));
}

const TABLES = [
    { title: '国内航路', tableClassName: 'sea-route-table', infoClassName: 'info' },
    { title: '国際航路', tableClassName: 'international-sea-route-table', infoClassName: 'information' },
    { title: '韓国 国内航路', tableClassName: 'sea-route-KR-table', infoClassName: 'information' },
];

export function RouteListPage({ viewModel, locationRef }: {
    viewModel: Pick<RouteListViewModel, 'getState' | 'subscribe' | 'search' | 'reset'>;
    locationRef?: Pick<Location, 'href'>;
}) {
    const state = useViewModelState(viewModel);
    const [searchText, setSearchText] = useState('');

    // 検索語が空の状態が通知されたら検索ボックスも空にする（旧 resetRoutesInDocument と同じ）
    useEffect(() => {
        if (!state.query) setSearchText('');
    }, [state]);

    const findTable = (tableClassName: string) => state.tables.find((table) => table.selector === `.${tableClassName} tbody`);
    const searchMessage = state.query && !hasVisibleRow(state, locationRef) ? '見つかりませんでした。' : '';

    return (
        <>
            <header className="header">
                <div className="wrapper-inner">
                    <p>おでかけ航路マップ</p>
                    <nav>
                        <ul>
                            <li>
                                <a href="./" title="マップ">
                                    <i className="fas fa-map"></i>
                                    <span>マップ</span>
                                </a>
                            </li>
                            <li>
                                <a href="./routeList.html" title="航路一覧">
                                    <i className="fas fa-ship"></i>
                                    <span>航路一覧</span>
                                </a>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>
            <h1>航路一覧</h1>
            <div className="sbox">
                <div className="sbox-inner">
                    <input type="text" id="searchbox" placeholder="検索キーワードを入力" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
                    <button id="searchbutton" onClick={() => viewModel.search(searchText)}>検索</button>
                    <button id="resetbutton" onClick={() => viewModel.reset()}>リセット</button>
                </div>
                <p id="search-message" style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>{searchMessage}</p>
            </div>
            <div className="feedback-callout">
                <p>
                    データの追加・修正依頼や機能要望は{' '}
                    <a href="https://forms.gle/xXyqvDkZKNwEXPv27" target="_blank" rel="noopener noreferrer">専用フォーム</a>{' '}
                    から送れます。
                </p>
            </div>
            {TABLES.map(({ title, tableClassName, infoClassName }) => (
                <Fragment key={tableClassName}>
                    <h2>{title}</h2>
                    <RouteTable
                        tableClassName={tableClassName}
                        infoClassName={infoClassName}
                        table={findTable(tableClassName)}
                        query={state.query}
                        locationRef={locationRef}
                    />
                </Fragment>
            ))}
        </>
    );
}
