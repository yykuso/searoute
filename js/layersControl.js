// レイヤーコントロールボタンの制御
export default class layersControl {
    constructor(options) {
        this.baseLayers = options.baseLayers || null;
        this.overLayers = options.overLayers || null;
    }
    
    onAdd(map) {
        this.map = map;
        this.layersControlAdd();
        return this.container;
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = null;
        return;
    }

    // レイヤーリスト作成
    //   div 
    //     - div toggle
    //     - div list (baseLayers / border / overLayers)
    //
    layersControlAdd() {
        // Control 全体
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        this.container.id = 'layers-control';

        // Toggle
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'maplibregl-ctrl-layers-toggle';
        this.container.appendChild(toggleContainer);
        this.container.addEventListener('mouseover', this.handleOver.bind(this));
        this.container.addEventListener('mouseout', this.handleOut.bind(this));

        const toggleIcon = document.createElement('i');
        toggleIcon.className = 'fa-solid fa-layer-group fa-lg';
        toggleContainer.appendChild(toggleIcon);

        // List
        const controlContainer = document.createElement('div');
        controlContainer.className = 'maplibregl-ctrl-layers-list';
        this.container.appendChild(controlContainer);
        controlContainer.style.display = 'none';

        // Base Layers
        if (this.baseLayers) {
            Object.keys(this.baseLayers).map((layer) => {
                this.radioButtonControlAdd(controlContainer, layer);
                controlContainer.appendChild(document.createElement('br'));
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
                this.checkBoxControlAdd(controlContainer, layer);
                controlContainer.appendChild(document.createElement('br'));
            });
        }
    }

    // Make Radio Button (Base Layers)
    radioButtonControlAdd(container, layerId) {
        const radioButton = document.createElement('input');
        radioButton.setAttribute('type', 'radio');
        radioButton.id = layerId;
        
        // Initialize (Default Base Layers)
        const initLayer = Object.keys(this.baseLayers)[0];
        if (layerId === initLayer) {
            radioButton.checked = true;
            this.map.setLayoutProperty(layerId, 'visibility', 'visible');
        } else {
            this.map.setLayoutProperty(layerId, 'visibility', 'none');
        }
        container.appendChild(radioButton);
        
        // Event
        radioButton.addEventListener('change', (event) => {
            // View Selected Layers
            event.target.checked = true;
            this.map.setLayoutProperty(layerId, 'visibility', 'visible');
            // Unview Selected Layers
            Object.keys(this.baseLayers).map((layer) => {
                if (layer !== event.target.id) {
                    document.getElementById(layer).checked = false;
                    this.map.setLayoutProperty(layer, 'visibility', 'none');
                }
            });
        });
        
        // Add Layers Name
        const layerName = document.createElement('label');
        layerName.htmlFor = layerId;
        layerName.appendChild(document.createTextNode(this.baseLayers[layerId]));
        container.appendChild(layerName);
    }

    // Make CheckBox Button (Overlay Layers)
    checkBoxControlAdd(container, layerId) {
        const checkBox = document.createElement('input');
        checkBox.setAttribute('type', 'checkbox');
        checkBox.id = layerId;

        // Unview All Layers
        this.map.setLayoutProperty(layerId, 'visibility', 'none');
        container.appendChild(checkBox);
        
        // Event
        checkBox.addEventListener('change', (event) => {
            // View or Unview Selected Layers
            if (event.target.checked) {
                this.map.setLayoutProperty(layerId, 'visibility', 'visible');
            } else {
                this.map.setLayoutProperty(layerId, 'visibility', 'none');
            }
        });

        // Add Layers Name
        const layerName = document.createElement('label');
        layerName.htmlFor = layerId;
        layerName.appendChild(document.createTextNode(this.overLayers[layerId]));
        container.appendChild(layerName);
    }

    // Control Event Mouseover
    handleOver() {
        this.container.childNodes[0].style.display = 'none';
        this.container.childNodes[1].style.display = 'inline';
    }

    // Control Event Mouseout
    handleOut() {
        this.container.childNodes[0].style.display = 'inline';
        this.container.childNodes[1].style.display = 'none';
    }
}
