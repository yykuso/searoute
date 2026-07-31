/**
 * レイヤー管理UIコントロールモジュール
 *
 * 責務:
 * - 地図上部のレイヤー切り替えパネルUI
 * - チェックボックスによるレイヤーの表示/非表示制御
 * - デフォルトレイヤー設定の管理
 * - レイヤー状態とコントロールの同期
 */

// レイヤーコントロールボタンの制御
import { trackEvent } from '../../adapters/analytics/googleAnalyticsAdapter.js';

export default class layersControl {
    constructor(options) {
        this.layers = options.layers || {};
        this.defaultBaseLayer = options.defaultBaseLayer || null;
        this.updateBaseMap = options.updateBaseMap;
        this.addOverLayer = options.addOverLayer;
        this.removeOverLayer = options.removeOverLayer;

        // レイヤータイプの定義
        this.layerTypes = {
            base: { type: 'radio', handler: this.handleBaseLayerChange.bind(this) },
            overlay: { type: 'checkbox', handler: this.handleOverlayLayerChange.bind(this) },
            geojson: { type: 'checkbox', handler: this.handleOverlayLayerChange.bind(this) }
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

    /**
     * Make Layers Control
     */
    addLayersControl() {
        // Control Container
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        this.container.id = 'layers-control';

        // Toggle Button
        this.container.appendChild(this.createToggleButton());

        // Control Container (レイヤーリスト)
        const controlContainer = document.createElement('div');
        controlContainer.className = 'maplibregl-ctrl-layers-list';
        controlContainer.style.display = 'none';
        this.container.appendChild(controlContainer);

        // レイヤーグループを順番に処理
        this.renderLayerGroups(controlContainer);

        // マウスオーバーイベント
        this.container.addEventListener('mouseover', this.handleOver.bind(this));
        this.container.addEventListener('mouseout', this.handleOut.bind(this));
    }

    /**
     * トグルボタンを作成
     */
    createToggleButton() {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'maplibregl-ctrl-layers-toggle';

        const toggleIcon = document.createElement('i');
        toggleIcon.className = 'fa-solid fa-layer-group fa-lg';
        toggleContainer.appendChild(toggleIcon);

        return toggleContainer;
    }

    /**
     * レイヤーグループをレンダリング
     */
    renderLayerGroups(container) {
        const groupOrder = ['base', 'overlay', 'geojson'];
        const groupTitles = {
            'base': 'ベースマップ',
            'overlay': 'オーバーレイ',
            'geojson': 'データレイヤー'
        };
        let addedGroups = 0;

        groupOrder.forEach((groupType) => {
            if (this.layers[groupType] && Object.keys(this.layers[groupType]).length > 0) {
                // グループ間に区切り線を追加（最初のグループ以外）
                if (addedGroups > 0) {
                    container.appendChild(document.createElement('hr'));
                }

                // グループヘッダーを作成
                const groupHeader = this.createGroupHeader(groupType, groupTitles[groupType]);
                container.appendChild(groupHeader);

                // グループコンテンツを作成
                const groupContent = this.createGroupContent(groupType);
                container.appendChild(groupContent);

                // グループヘッダーにクリックイベントを追加
                groupHeader.addEventListener('click', () => {
                    this.toggleGroupVisibility(groupType);
                });

                // グループ内のレイヤーをレンダリング
                this.renderLayerGroup(groupContent, groupType, this.layers[groupType]);
                addedGroups++;
            }
        });
    }

    /**
     * グループヘッダーを作成
     */
    createGroupHeader(groupType, title) {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'layer-group-header';
        groupHeader.textContent = title;
        groupHeader.style.cursor = 'pointer';
        groupHeader.setAttribute('data-group', groupType);
        return groupHeader;
    }

    /**
     * グループコンテンツコンテナを作成
     */
    createGroupContent(groupType) {
        const groupContent = document.createElement('div');
        groupContent.className = 'layer-group-content';
        groupContent.setAttribute('data-group', groupType);
        return groupContent;
    }

    /**
     * レイヤーグループをレンダリング
     */
    renderLayerGroup(container, groupType, layersData) {
        Object.entries(layersData).forEach(([layerId, layerConfig]) => {
            const containerDiv = document.createElement('div');
            containerDiv.className = 'layer-item-container';

            const layerItem = this.createLayerItem(layerId, layerConfig, groupType);
            containerDiv.appendChild(layerItem);
            container.appendChild(containerDiv);
        });
    }

    /**
     * レイヤーアイテムを作成（入力・ラベル・イベント配線含む）
     */
    createLayerItem(layerId, layerConfig, groupType) {
        const layerType = this.layerTypes[groupType];
        if (!layerType) return null;

        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';

        // 入力要素を作成
        const input = this.createLayerInput(layerId, groupType, layerType.type);
        layerItem.appendChild(input);

        // ラベルを作成
        const label = document.createElement('label');
        label.htmlFor = layerId;
        label.textContent = layerConfig.name || layerId;
        layerItem.appendChild(label);

        // ツールチップを追加
        if (layerConfig.description) {
            const tooltip = document.createElement('div');
            tooltip.className = 'layer-tooltip';
            tooltip.textContent = layerConfig.description;
            layerItem.appendChild(tooltip);
        }

        // 初期状態を設定
        this.setInitialState(input, layerId, layerConfig, groupType);

        // イベント配線
        this.attachLayerItemEvents(layerItem, input, layerId, layerConfig, groupType, layerType);

        return layerItem;
    }

    /**
     * 入力要素を作成
     */
    createLayerInput(layerId, groupType, inputType) {
        const input = document.createElement('input');
        input.setAttribute('type', inputType);
        input.id = layerId;
        input.name = groupType === 'base' ? 'mapStyle' : groupType;
        return input;
    }

    /**
     * レイヤーアイテムのイベント配線
     */
    attachLayerItemEvents(layerItem, input, layerId, layerConfig, groupType, layerType) {
        // アイテム全体のクリックイベント
        layerItem.addEventListener('click', (event) => {
            if (event.target !== input) {
                if (layerType.type === 'checkbox') {
                    input.checked = !input.checked;
                } else {
                    input.checked = true;
                }
                input.dispatchEvent(new Event('change'));
                event.preventDefault();
            }
        });

        // チェック状態変更イベント
        input.addEventListener('change', (event) => {
            // UI 状態更新
            if (event.target.checked) {
                layerItem.classList.add('checked');
            } else {
                layerItem.classList.remove('checked');
            }

            // ハンドラー実行
            layerType.handler(layerId, layerConfig, event.target.checked);
        });

        // 初期チェック状態を反映
        if (input.checked) {
            layerItem.classList.add('checked');
        }
    }

    /**
     * 初期状態を設定
     */
    setInitialState(input, layerId, layerConfig, groupType) {
        if (groupType === 'base') {
            const numericId = Number(layerConfig.id || layerConfig);
            if (this.defaultBaseLayer === null) {
                input.checked = true;
                this.defaultBaseLayer = numericId;
                this.updateBaseMap(numericId);
            } else if (numericId === this.defaultBaseLayer) {
                input.checked = true;
                this.updateBaseMap(numericId);
            }
        } else {
            const isVisible = layerConfig.visible || false;
            if (isVisible) {
                input.checked = true;
                this.addOverLayer(layerId);
            }
        }
    }

    handleBaseLayerChange(layerId, layerConfig, checked) {
        if (checked) {
            const numericId = Number(layerConfig.id || layerConfig);
            this.updateBaseMap(numericId);
            trackEvent('map_basemap_change', 'map', layerConfig.name || layerId);
        }
    }

    handleOverlayLayerChange(layerId, layerConfig, checked) {
        if (checked) {
            this.addOverLayer(layerId);
            trackEvent('map_overlayer_change', 'map', layerConfig.name || layerId);
        } else {
            this.removeOverLayer(layerId);
            trackEvent('map_overlayer_change', 'map', layerConfig.name || layerId, 0);
        }
    }

    /**
     * Set Layer Visibility
     */
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

    /**
     * グループの表示/非表示を切り替え
     */
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

    /**
     * Control Event Mouseover
     */
    handleOver() {
        const layersList = this.container.childNodes[1];
        layersList.style.display = 'block';
    }

    /**
     * Control Event Mouseout
     */
    handleOut() {
        const layersList = this.container.childNodes[1];
        layersList.style.display = 'none';
    }
}
