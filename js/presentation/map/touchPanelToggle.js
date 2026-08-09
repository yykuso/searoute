let activePanelCloser = null;

export function bindTouchPanelToggle(
    toggleElement,
    panelElement,
    { documentRef = document } = {},
) {
    const closePanel = () => {
        panelElement.style.display = 'none';
        documentRef.removeEventListener('touchstart', handleOutsideTouch);
        if (activePanelCloser === closePanel) {
            activePanelCloser = null;
        }
    };

    const handleOutsideTouch = (event) => {
        if (toggleElement.contains(event.target) || panelElement.contains(event.target)) return;
        closePanel();
    };

    const handleTouchStart = (event) => {
        if (event.touches.length !== 1) return;

        event.preventDefault();
        event.stopPropagation();
        if (panelElement.style.display === 'block') {
            closePanel();
            return;
        }

        activePanelCloser?.();
        panelElement.style.display = 'block';
        activePanelCloser = closePanel;
        documentRef.addEventListener('touchstart', handleOutsideTouch, { passive: true });
    };

    toggleElement.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
        closePanel();
        toggleElement.removeEventListener('touchstart', handleTouchStart);
    };
}