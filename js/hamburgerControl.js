/**
 * ハンバーガーメニューUIコントロール
 *
 * 責務:
 * - サイト情報・設定パネルの開閉ボタン
 * - マップコントロール左上に配置
 * - モバイル向けナビゲーションメニュー
 */

import { setupOutsideClickListener } from './utils/outsideClickHandler.js';

export default class hamburgerControl {
    constructor() {
        this._infoWindowUnsubscriber = null;
    }

    onAdd(map) {
        this.map = map;
        this.addHamburgerControl();
        return this.container;
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = undefined;

        // クリーンアップ
        if (this._infoWindowUnsubscriber) {
            this._infoWindowUnsubscriber();
        }
    }

    /**
     * Make Hamburger Control
     */
    addHamburgerControl() {
        // Control Container
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        this.container.id = 'hamburger-control';

        // Toggle Button
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'maplibregl-ctrl-hamburger-toggle';
        this.container.appendChild(toggleContainer);
        this.container.addEventListener('mouseover', this.handleOver.bind(this));
        this.container.addEventListener('mouseout', this.handleOut.bind(this));

        const toggleIcon = document.createElement('i');
        toggleIcon.className = 'fa-solid fa-bars fa-lg';
        toggleContainer.appendChild(toggleIcon);

        // Content Container
        const contentContainer = document.createElement('div');
        contentContainer.className = 'maplibregl-ctrl-hamburger-list';
        contentContainer.style.display = 'none';
        this.container.appendChild(contentContainer);

        // メニューアイテムを追加
        this.createMenuItems(contentContainer);

        // ウィンドウ要素を取得
        this.infoWindow = document.getElementById('info-window');

        // ウィンドウのクローズボタンにイベント設定
        if (this.infoWindow) {
            this.infoWindow.querySelector('#info-close-btn').onclick = () => {
                this.infoWindow.style.display = 'none';
            };
        }
    }

    /**
     * メニューアイテムを作成
     */
    createMenuItems(container) {
        // サイト情報
        const infoMenu = document.createElement('div');
        const infoLink = document.createElement('a');
        infoLink.href = '#info-window';
        infoLink.innerHTML = '<i class="fa-solid fa-circle-info"></i> サイト情報';
        infoLink.onclick = this.showInfoWindow.bind(this);
        infoMenu.appendChild(infoLink);
        container.appendChild(infoMenu);

        // 航路一覧
        const routeMenu = document.createElement('div');
        const routeLink = document.createElement('a');
        routeLink.href = './routeList.html';
        routeLink.innerHTML = '<i class="fa-solid fa-ship"></i> 航路一覧';
        routeMenu.appendChild(routeLink);
        container.appendChild(routeMenu);

    }

    /**
     * サイト情報ウィンドウを表示
     */
    showInfoWindow(event) {
        if (!this.infoWindow) return;

        event.preventDefault();
        this.infoWindow.style.display = 'block';

        // 前の登録をクリーンアップ
        if (this._infoWindowUnsubscriber) {
            this._infoWindowUnsubscriber();
        }

        // 外側クリック検出を登録（100ms遅延で即閉じ防止）
        this._infoWindowUnsubscriber = setupOutsideClickListener(
            this.infoWindow,
            () => {
                this.infoWindow.style.display = 'none';
            },
            { delay: 100 }
        );
    }

    /**
     * Control Event Mouseover
     */
    handleOver() {
        this.container.childNodes[1].style.display = 'block';
    }

    /**
     * Control Event Mouseout
     */
    handleOut() {
        this.container.childNodes[1].style.display = 'none';
    }
}
