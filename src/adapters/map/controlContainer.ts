/**
 * 中身を外部（React のポータル）で描画する MapLibre コントロール
 * 旧 hamburgerControl / layerControlView / routeFilterControl のコンテナ部分
 */
import type { IControl } from 'maplibre-gl';

export class ContainerControl implements IControl {
    readonly container: HTMLDivElement;

    constructor(id: string, documentRef: Document = document) {
        this.container = documentRef.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        this.container.id = id;
    }

    onAdd(): HTMLElement {
        return this.container;
    }

    onRemove(): void {
        this.container.parentNode?.removeChild(this.container);
    }
}
