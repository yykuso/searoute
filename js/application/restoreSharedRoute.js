export async function restoreSharedRoute({ ensureSharedLayerEnabled, initShareFromUrl }) {
    try {
        await ensureSharedLayerEnabled();
    } catch (error) {
        console.warn('Failed to enable shared layer:', error);
    }
    await initShareFromUrl();
}
