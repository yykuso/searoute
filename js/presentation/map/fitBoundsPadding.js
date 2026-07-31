export function calculateFitBoundsPadding({
    documentRef = document,
    windowRef = globalThis,
    drawerWidth = 0,
    drawerHeight = 0,
} = {}) {
    const padding = { top: 50, left: 50, right: 50, bottom: 50 };
    const drawer = documentRef.getElementById('detail-drawer');
    if (drawer && !drawer.classList.contains('hidden')) {
        if (windowRef.innerWidth >= 768) {
            padding.left = drawerWidth + 30;
        } else {
            padding.bottom = drawerHeight + 30;
        }
    }
    return padding;
}
