export default class hamburgerControl {
    onAdd(map) {
        this.map = map;
        this.addHamburgerControl();
        return this.container;
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = undefined;
    }

    // Make Humburger Control
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
        this.container.appendChild(contentContainer);
        contentContainer.style.display = 'none';    // 初期非表示

        const routeMenu = document.createElement('div');
        const link = document.createElement('a');
        link.href = './routeList.html';
        link.innerHTML = '<i class="fa-solid fa-ship"></i> 航路一覧';
        routeMenu.appendChild(link);
        contentContainer.appendChild(routeMenu);

        const infoMenu = document.createElement('div');
        const infoLink = document.createElement('a');
        infoLink.href = '#info-window';
        infoLink.innerHTML = '<i class="fa-solid fa-circle-info"></i> サイト情報';
        infoLink.onclick = this.showInfoWindow.bind(this);
        infoMenu.appendChild(infoLink);
        contentContainer.appendChild(infoMenu);

        const settingsMenu = document.createElement('div');
        const settingsLink = document.createElement('a');
        settingsLink.href = '#settings-window';
        settingsLink.innerHTML = '<i class="fa-solid fa-gear"></i> 設定';
        settingsLink.onclick = this.showSettingsWindow.bind(this);
        settingsMenu.appendChild(settingsLink);
        contentContainer.appendChild(settingsMenu);

        this.infoWindow = document.getElementById('info-window');
        if (this.infoWindow) {
            this.infoWindow.querySelector('#info-close-btn').onclick = () => {
                this.infoWindow.style.display = 'none';
            };
        }

        this.settingsWindow = document.getElementById('settings-window');
        if (this.settingsWindow) {
            this.settingsWindow.querySelector('#settings-close-btn').onclick = () => {
                this.settingsWindow.style.display = 'none';
            };
        }
    }

    showInfoWindow() {
        if (this.infoWindow) {
            this.infoWindow.style.display = 'block';

            // 既存のイベントを一度解除
            document.removeEventListener('mousedown', this._infoWindowOutsideHandler);

            // 外側クリックで閉じるイベントを追加
            this._infoWindowOutsideHandler = (e) => {
                // info-window自身またはその子要素をクリックした場合は何もしない
                if (!this.infoWindow.contains(e.target)) {
                    this.infoWindow.style.display = 'none';
                    document.removeEventListener('mousedown', this._infoWindowOutsideHandler);
                }
            };
            setTimeout(() => { // setTimeoutでイベント登録を遅らせることで、ボタン自体のクリックで即閉じを防ぐ
                document.addEventListener('mousedown', this._infoWindowOutsideHandler);
            }, 0);
        }
    }

    showSettingsWindow() {
        if (this.settingsWindow) {
            this.settingsWindow.style.display = 'block';

            // 既存のイベントを一度解除
            document.removeEventListener('mousedown', this._settingsWindowOutsideHandler);

            // 外側クリックで閉じるイベントを追加
            this._settingsWindowOutsideHandler = (e) => {
                // settings-window自身またはその子要素をクリックした場合は何もしない
                if (!this.settingsWindow.contains(e.target)) {
                    this.settingsWindow.style.display = 'none';
                    document.removeEventListener('mousedown', this._settingsWindowOutsideHandler);
                }
            };
            setTimeout(() => { // setTimeoutでイベント登録を遅らせることで、ボタン自体のクリックで即閉じを防ぐ
                document.addEventListener('mousedown', this._settingsWindowOutsideHandler);
            }, 0);
        }
    }

    // Control Event Mouseover
    handleOver() {
        this.container.childNodes[1].style.display = 'block';
    }

    // Control Event Mouseout
    handleOut() {
        this.container.childNodes[1].style.display = 'none';
    }

}
