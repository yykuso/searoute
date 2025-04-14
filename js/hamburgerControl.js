
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

        const menu = document.createElement('div');
        const link = document.createElement('a');
        link.href = './routeList.html';
        link.innerHTML = '<i class="fa-solid fa-ship"></i> 航路一覧';
        menu.appendChild(link);
        contentContainer.appendChild(menu);

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
