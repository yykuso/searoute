import {
    createRouteSearchPattern,
    matchesRouteSearchText,
} from '../../domain/route.js';

const COLUMN_CLASS_MAP = {
    routeId: ['route-id'],
    businessName: ['business-name'],
    routeName: ['route-name'],
    info: ['info', 'information'],
    shipName: ['ship-name'],
    url: ['url'],
};

export function buildRouteMapUrl(routeId, sourceId, { locationRef = window.location } = {}) {
    const url = new URL('./index.html', locationRef.href);
    url.searchParams.set('share', 'route');
    url.searchParams.set('routeId', routeId);
    url.searchParams.set('sourceId', sourceId);
    return url.toString();
}

export function applyColumnVisibility(tableBody, visibleColumns) {
    const table = tableBody.closest('table');
    if (!table) {
        return;
    }

    Object.entries(COLUMN_CLASS_MAP).forEach(([column, classNames]) => {
        const isVisible = visibleColumns.includes(column);
        classNames.forEach((className) => {
            table.querySelectorAll(`.${className}`).forEach((cell) => {
                cell.style.display = isVisible ? '' : 'none';
            });
        });
    });
}

export function renderRouteRows(tableBody, rows, visibleColumns, sourceId, { documentRef = document, locationRef } = {}) {
    rows.forEach((rowData) => {
        const { routeId, businessName, routeName, info, shipName, note, url } = rowData;
        const row = documentRef.createElement('tr');

        if (note === 'season') {
            row.classList.add('season-row');
        } else if (note === 'suspend') {
            row.classList.add('suspend-row');
        }

        visibleColumns.forEach((column) => {
            if (column === 'routeName') {
                const routeNameCell = documentRef.createElement('td');
                const routeNameLink = documentRef.createElement('a');
                routeNameLink.href = buildRouteMapUrl(routeId, sourceId, locationRef ? { locationRef } : {});
                routeNameLink.textContent = routeName || '-';
                routeNameLink.rel = 'noopener noreferrer';
                routeNameCell.appendChild(routeNameLink);
                row.appendChild(routeNameCell);
                return;
            }

            if (column === 'url') {
                const urlCell = documentRef.createElement('td');
                if (url) {
                    const link = documentRef.createElement('a');
                    link.href = url;
                    link.textContent = 'リンク';
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    urlCell.appendChild(link);
                } else {
                    urlCell.textContent = '-';
                }
                row.appendChild(urlCell);
                return;
            }

            const cell = documentRef.createElement('td');
            cell.textContent = rowData[column] || '-';
            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });
}

export function searchRoutesInDocument(documentRef, query) {
    const searchMessage = documentRef.getElementById('search-message');

    if (!query) {
        if (searchMessage) searchMessage.textContent = '';
        return;
    }

    const rows = documentRef.querySelectorAll('table tbody tr');
    let found = false;

    rows.forEach(row => row.style.display = '');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let matches = false;

        cells.forEach(cell => {
            const text = cell.textContent;

            const originalHtml = cell.getAttribute('data-original-text');
            if (originalHtml) {
                cell.innerHTML = originalHtml;
                cell.removeAttribute('data-original-text');
            }

            if (matchesRouteSearchText(text, query)) {
                matches = true;

                if (!cell.getAttribute('data-original-text')) {
                    cell.setAttribute('data-original-text', cell.innerHTML);
                }

                const regex = createRouteSearchPattern(query);
                cell.innerHTML = cell.innerHTML.replace(regex, '<span style="background-color: #ffe46f;">$1</span>');
            }
        });

        if (!matches) {
            row.style.display = 'none';
        } else {
            found = true;
        }
    });

    if (searchMessage) searchMessage.textContent = found ? '' : '見つかりませんでした。';
}

export function resetRoutesInDocument(documentRef) {
    const searchBox = documentRef.getElementById('searchbox');
    const searchMessage = documentRef.getElementById('search-message');
    const rows = documentRef.querySelectorAll('table tbody tr');

    if (searchBox) searchBox.value = '';

    rows.forEach(row => {
        row.style.display = '';
        const cells = row.querySelectorAll('td');

        cells.forEach(cell => {
            const originalHtml = cell.getAttribute('data-original-text');
            if (originalHtml) {
                cell.innerHTML = originalHtml;
                cell.removeAttribute('data-original-text');
            }
        });
    });

    if (searchMessage) searchMessage.textContent = '';
}

export function renderRouteListState(documentRef, state, { locationRef } = {}) {
    state.tables.forEach((tableState) => {
        const tableBody = documentRef.querySelector(tableState.selector);
        if (!tableBody) {
            return;
        }

        tableBody.innerHTML = '';
        applyColumnVisibility(tableBody, tableState.visibleColumns);
        renderRouteRows(
            tableBody,
            tableState.rows,
            tableState.visibleColumns,
            tableState.sourceId,
            { documentRef, locationRef },
        );
    });

    if (state.query) {
        searchRoutesInDocument(documentRef, state.query);
        return;
    }

    resetRoutesInDocument(documentRef);
}

export function createRouteListPageView({ documentRef = document, locationRef = window.location } = {}) {
    function getSearchQuery() {
        const searchBox = documentRef.getElementById('searchbox');
        return searchBox ? searchBox.value : '';
    }

    function bindSearch(handler) {
        const searchButton = documentRef.getElementById('searchbutton');
        if (searchButton) {
            searchButton.addEventListener('click', handler);
        }
    }

    function bindReset(handler) {
        const resetButton = documentRef.getElementById('resetbutton');
        if (resetButton) {
            resetButton.addEventListener('click', handler);
        }
    }

    function render(state) {
        renderRouteListState(documentRef, state, { locationRef });
    }

    return {
        bindSearch,
        bindReset,
        getSearchQuery,
        render,
    };
}
