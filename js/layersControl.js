import { updateBaseMap, addOverLayer, removeOverLayer } from './common.js';

// レイヤーコントロールボタンの制御
export default class layersControl {
    constructor(options) {
        this.baseLayers = options.baseLayers || null;
        this.overLayers = options.overLayers || null;
        this.geojsonLayers = options.geojsonLayers || null;
        this.defaultBaseLayer = options.defaultBaseLayer || null;
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

        // Radio button
        const controlContainer = document.createElement('div');
        controlContainer.className = 'maplibregl-ctrl-layers-list';
        this.container.appendChild(controlContainer);
        controlContainer.style.display = 'none';    // 初期非表示

        // Base Layers
        if (this.baseLayers) {
            Object.keys(this.baseLayers).map((layer) => {
                const containerDiv = document.createElement('div');
                this.addRadioButton(containerDiv, layer);
                controlContainer.appendChild(containerDiv);
            });
        }

        // border line
        if (this.baseLayers && this.overLayers) {
            const hr = document.createElement('hr');
            controlContainer.appendChild(hr);
        }
        
        // Over Layers
        if (this.overLayers) {
            Object.keys(this.overLayers).map((layer) => {
                const containerDiv = document.createElement('div');
                const isVisible = this.overLayers[layer].visible || false;
                this.addCheckBoxControl(containerDiv, layer, isVisible, this.overLayers[layer].name, 'overLayer');
                controlContainer.appendChild(containerDiv);
            });
        }
        
        // border line
        if (this.overLayers && this.geojsonLayers) {
            const hr = document.createElement('hr');
            controlContainer.appendChild(hr);
        }
        
        // Over Layers
        if (this.geojsonLayers) {
            Object.keys(this.geojsonLayers).map((layer) => {
                const containerDiv = document.createElement('div');
                const isVisible = this.geojsonLayers[layer].visible || false;
                this.addCheckBoxControl(containerDiv, layer, isVisible, this.geojsonLayers[layer].name, 'geojsonLayer');
                controlContainer.appendChild(containerDiv);
            });
        }
    }

    // Make Radio Button (Base Layers)
    addRadioButton(container, layerId) {
        const displayName = layerId;
        layerId = Number(this.baseLayers[layerId]);

        const radioButton = document.createElement('input');
        radioButton.setAttribute('type', 'radio');
        radioButton.id = layerId;
        radioButton.name = 'mapStyle';
        
        // Initialize (Default Base Layers)
        const initLayer = this.defaultBaseLayer;
        if (initLayer == null) {
            // If DefaultBaseLayer is not set, set the first layer as the default
            radioButton.checked = true;
            this.defaultBaseLayer = radioButton.id;
            updateBaseMap(layerId);
        } else if (layerId === initLayer) {
            // If DefaultBaseLayer is set, set the specified layer as the default
            radioButton.checked = true;
            updateBaseMap(layerId);
        }
        container.appendChild(radioButton);
        
        // Add Layers Name
        const layerName = document.createElement('label');
        layerName.htmlFor = radioButton.id;
        layerName.appendChild(document.createTextNode(displayName));
        container.appendChild(layerName);
        
        // Event
        radioButton.addEventListener('change', (event) => {
            updateBaseMap(layerId);

            gtag('event', 'map_basemap_change', {
                'event_category': 'map',
                'event_label': displayName,
                'value': 1
            });
        });
    }

    // Make CheckBox Button (Overlay Layers)
    addCheckBoxControl(container, layerId, isVisible, displayName, name) {
        const checkBox = document.createElement('input');
        checkBox.setAttribute('type', 'checkbox');
        checkBox.id = layerId;
        checkBox.name = name;

        // Initialize (Default Overlay Layers)
        if (isVisible) {
            checkBox.checked = true;
            addOverLayer(layerId);
        }
        container.appendChild(checkBox);
        
        // Add Layers Name
        const layerName = document.createElement('label');
        layerName.htmlFor = layerId;
        layerName.appendChild(document.createTextNode(displayName));
        container.appendChild(layerName);

        // Event
        checkBox.addEventListener('change', (event) => {
            if (checkBox.checked) {
                addOverLayer(layerId);

                gtag('event', 'map_overlayer_change', {
                    'event_category': 'map',
                    'event_label': displayName,
                    'value': 1
                });
                
            } else {
                removeOverLayer(layerId);

                gtag('event', 'map_overlayer_change', {
                    'event_category': 'map',
                    'event_label': displayName,
                    'value': 0
                });
            }
        });
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

    // Control Event Mouseover
    handleOver() {
        this.container.childNodes[0].style.display = 'none';
        this.container.childNodes[1].style.display = '';
    }

    // Control Event Mouseout
    handleOut() {
        this.container.childNodes[0].style.display = '';
        this.container.childNodes[1].style.display = 'none';
    }
}
