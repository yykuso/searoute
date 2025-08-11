import { updateBaseMap, addOverLayer, removeOverLayer } from './common.js';

// レイヤーコントロールボタンの制御
export default class layersControl {
    constructor(options) {
        this.layers = options.layers || {};
        this.defaultBaseLayer = options.defaultBaseLayer || null;

        // レイヤータイプの定義
        this.layerTypes = {
            base: { type: 'radio', handler: this.handleBaseLayerChange.bind(this) },
            overlay: { type: 'checkbox', handler: this.handleOverlayLayerChange.bind(this) },
            geojson: { type: 'checkbox', handler: this.handleGeoJsonLayerChange.bind(this) }
        };
    }

    onAdd(map) {
        this.map = map;
        this.addLayersControl();
        return this.container;
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = null;
        return;
    }

    // Make Layers Control
    addLayersControl() {
        // Control Container
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        this.container.id = 'layers-control';

        // Toggle Button
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'maplibregl-ctrl-layers-toggle';
        this.container.appendChild(toggleContainer);
        this.container.addEventListener('mouseover', this.handleOver.bind(this));
        this.container.addEventListener('mouseout', this.handleOut.bind(this));
        const toggleIcon = document.createElement('i');
        toggleIcon.className = 'fa-solid fa-layer-group fa-lg';
        toggleContainer.appendChild(toggleIcon);

        // Control Container
        const controlContainer = document.createElement('div');
        controlContainer.className = 'maplibregl-ctrl-layers-list';
        this.container.appendChild(controlContainer);
        controlContainer.style.display = 'none';    // 初期非表示

        // レイヤーグループを順番に処理
        this.renderLayerGroups(controlContainer);
    }

    // レイヤーグループをレンダリング
    renderLayerGroups(container) {
        const groupOrder = ['base', 'overlay', 'geojson'];
        const groupTitles = {
            'base': 'ベースマップ',
            'overlay': 'オーバーレイ',
            'geojson': 'データレイヤー'
        };
        let addedGroups = 0;

        groupOrder.forEach((groupType, index) => {
            if (this.layers[groupType] && Object.keys(this.layers[groupType]).length > 0) {
                // グループ間に区切り線を追加（最初のグループ以外）
                if (addedGroups > 0) {
                    const hr = document.createElement('hr');
                    container.appendChild(hr);
                }

                // グループヘッダーを追加
                const groupHeader = document.createElement('div');
                groupHeader.className = 'layer-group-header';
                groupHeader.textContent = groupTitles[groupType];
                groupHeader.style.cursor = 'pointer';
                groupHeader.setAttribute('data-group', groupType);
                container.appendChild(groupHeader);

                // グループコンテンツコンテナを作成
                const groupContent = document.createElement('div');
                groupContent.className = 'layer-group-content';
                groupContent.setAttribute('data-group', groupType);
                container.appendChild(groupContent);

                // グループヘッダーにクリックイベントを追加
                groupHeader.addEventListener('click', () => {
                    this.toggleGroupVisibility(groupType);
                });

                this.renderLayerGroup(groupContent, groupType, this.layers[groupType]);
                addedGroups++;
            }
        });
    }

    // レイヤーグループをレンダリング
    renderLayerGroup(container, groupType, layersData) {
        Object.entries(layersData).forEach(([layerId, layerConfig]) => {
            const containerDiv = document.createElement('div');
            containerDiv.className = 'layer-item-container';
            this.createLayerControl(containerDiv, layerId, layerConfig, groupType);
            container.appendChild(containerDiv);
        });
    }

    // レイヤーコントロールを作成
    createLayerControl(container, layerId, layerConfig, groupType) {
        const layerType = this.layerTypes[groupType];
        if (!layerType) return;

        // レイヤーアイテムのコンテナ
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';

        const input = document.createElement('input');
        input.setAttribute('type', layerType.type);
        input.id = layerId;
        input.name = groupType === 'base' ? 'mapStyle' : groupType;

        // 初期状態の設定
        this.setInitialState(input, layerId, layerConfig, groupType);

        layerItem.appendChild(input);

        // ラベルを追加
        const label = document.createElement('label');
        label.htmlFor = layerId;
        label.textContent = layerConfig.name || layerId;
        layerItem.appendChild(label);

        // ツールチップを追加（アイコンなしで直接レイヤーアイテムに）
        if (layerConfig.description) {
            const tooltip = document.createElement('div');
            tooltip.className = 'layer-tooltip';
            tooltip.textContent = layerConfig.description;
            layerItem.appendChild(tooltip);
        }

        // クリックイベントをレイヤーアイテム全体に設定
        const handleActivation = (event) => {
            if (event.target !== input) {
                if (layerType.type === 'checkbox') {
                    input.checked = !input.checked;
                } else {
                    input.checked = true;
                }
                input.dispatchEvent(new Event('change'));
                event.preventDefault();
            }
        };

        layerItem.addEventListener('click', handleActivation);

        // チェック状態の表示を更新
        const updateCheckedState = () => {
            if (input.checked) {
                layerItem.classList.add('checked');
            } else {
                layerItem.classList.remove('checked');
            }
        };

        // 初期状態を設定
        updateCheckedState();

        // イベントリスナーを追加
        input.addEventListener('change', (event) => {
            updateCheckedState();
            layerType.handler(layerId, layerConfig, event.target.checked);
        });

        container.appendChild(layerItem);
    }

    // 初期状態を設定
    setInitialState(input, layerId, layerConfig, groupType) {
        if (groupType === 'base') {
            const numericId = Number(layerConfig.id || layerConfig);
            if (this.defaultBaseLayer === null) {
                input.checked = true;
                this.defaultBaseLayer = numericId;
                updateBaseMap(numericId);
            } else if (numericId === this.defaultBaseLayer) {
                input.checked = true;
                updateBaseMap(numericId);
            }
        } else {
            const isVisible = layerConfig.visible || false;
            if (isVisible) {
                input.checked = true;
                addOverLayer(layerId);
            }
        }
    }

    // ベースレイヤー変更ハンドラー
    handleBaseLayerChange(layerId, layerConfig, checked) {
        if (checked) {
            const numericId = Number(layerConfig.id || layerConfig);
            updateBaseMap(numericId);

            gtag('event', 'map_basemap_change', {
                'event_category': 'map',
                'event_label': layerConfig.name || layerId,
                'value': 1
            });
        }
    }

    // オーバーレイレイヤー変更ハンドラー
    handleOverlayLayerChange(layerId, layerConfig, checked) {
        if (checked) {
            addOverLayer(layerId);
            gtag('event', 'map_overlayer_change', {
                'event_category': 'map',
                'event_label': layerConfig.name || layerId,
                'value': 1
            });
        } else {
            removeOverLayer(layerId);
            gtag('event', 'map_overlayer_change', {
                'event_category': 'map',
                'event_label': layerConfig.name || layerId,
                'value': 0
            });
        }
    }

    // GeoJSONレイヤー変更ハンドラー
    handleGeoJsonLayerChange(layerId, layerConfig, checked) {
        if (checked) {
            addOverLayer(layerId);
            gtag('event', 'map_overlayer_change', {
                'event_category': 'map',
                'event_label': layerConfig.name || layerId,
                'value': 1
            });
        } else {
            removeOverLayer(layerId);
            gtag('event', 'map_overlayer_change', {
                'event_category': 'map',
                'event_label': layerConfig.name || layerId,
                'value': 0
            });
        }
    }

    // Set Layer Visibility
    setLayerVisibility(layerId, visibility, subLayers = []) {
        if (subLayers.length > 0) {
            subLayers.forEach(layer => {
                if (this.map.getLayer(layer)) {
                    this.map.setLayoutProperty(layer, 'visibility', visibility);
                }
            });
        } else {
            if (this.map.getLayer(layerId)) {
                this.map.setLayoutProperty(layerId, 'visibility', visibility);
            }
        }
    }

    // グループの表示/非表示を切り替え
    toggleGroupVisibility(groupType) {
        const groupContent = this.container.querySelector(`.layer-group-content[data-group="${groupType}"]`);
        const groupHeader = this.container.querySelector(`.layer-group-header[data-group="${groupType}"]`);

        if (groupContent) {
            const isCollapsed = groupContent.classList.contains('collapsed');

            if (isCollapsed) {
                groupContent.classList.remove('collapsed');
                groupHeader.classList.remove('collapsed');
            } else {
                groupContent.classList.add('collapsed');
                groupHeader.classList.add('collapsed');
            }
        }
    }

    // Control Event Mouseover
    handleOver() {
        this.container.childNodes[0].style.display = 'none';
        const layersList = this.container.childNodes[1];
        layersList.style.display = 'block';
    }

    // Control Event Mouseout
    handleOut() {
        const layersList = this.container.childNodes[1];
        layersList.style.display = 'none';
        this.container.childNodes[0].style.display = 'flex';
    }
}
