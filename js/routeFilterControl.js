/**
 * 航路フィルタ用の独立コントロール
 */
export default class routeFilterControl {
    onAdd() {
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        this.container.id = 'route-filter-control';

        const button = document.createElement('div');
        button.className = 'maplibregl-ctrl-filter-toggle';
        button.setAttribute('aria-label', '航路フィルタ');

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-filter fa-lg';
        button.appendChild(icon);

        const panel = document.createElement('div');
        panel.className = 'maplibregl-ctrl-filter-list';
        panel.style.display = 'none';
        panel.innerHTML = this.buildFilterPanelHtml();

        this.container.appendChild(button);
        this.container.appendChild(panel);
        this.container.addEventListener('mouseover', this.handleOver.bind(this));
        this.container.addEventListener('mouseout', this.handleOut.bind(this));

        return this.container;
    }

    buildFilterPanelHtml() {
        return `
            ${this.buildFilterSection('航路情報', 'fa-solid fa-circle-info', [
                { group: 'status', key: 'active', label: '就航中', icon: 'fa-solid fa-circle-check' },
                { group: 'status', key: 'season', label: '季節運航', icon: 'fa-solid fa-calendar-days' },
                { group: 'status', key: 'suspend', label: '休止中', icon: 'fa-solid fa-ban' },
            ])}
            <hr>
            ${this.buildFilterSection('航送可否 (仮)', 'fa-solid fa-ship', [
                { group: 'carriage', key: 'car', label: '自動車', icon: 'fa-solid fa-car' },
                { group: 'carriage', key: 'bike', label: 'バイク', icon: 'fa-solid fa-motorcycle' },
                { group: 'carriage', key: 'bicycle', label: '自転車', icon: 'fa-solid fa-bicycle' },
            ])}
        `;
    }

    buildFilterSection(title, iconClass, items) {
        return `
            <div class="route-filter-section">
                <div class="route-filter-section-title">
                    <i class="${iconClass}"></i><span>${title}</span>
                </div>
                ${items.map((item) => this.buildFilterItem(item)).join('')}
            </div>
        `;
    }

    buildFilterItem(item) {
        return `
            <label class="route-filter-item">
                <input type="checkbox" data-route-filter-group="${item.group}" data-route-filter-key="${item.key}">
                <span class="route-filter-item-label"><i class="${item.icon}"></i><span>${item.label}</span></span>
            </label>
        `;
    }

    handleOver() {
        this.container.childNodes[1].style.display = 'block';
    }

    handleOut() {
        this.container.childNodes[1].style.display = 'none';
    }


    onRemove() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
    }
}
