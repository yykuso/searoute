export function createLoadingIndicator(options = {}) {
    const {
        documentRef = globalThis.document,
        elementId = 'loading',
    } = options;
    let activeCount = 0;

    function show() {
        const element = documentRef?.getElementById(elementId);
        if (!element) {
            return;
        }

        activeCount++;
        element.style.display = 'block';
    }

    function hide() {
        const element = documentRef?.getElementById(elementId);
        if (!element) {
            return;
        }

        activeCount--;
        if (activeCount <= 0) {
            activeCount = 0;
            element.style.display = 'none';
        }
    }

    return { show, hide };
}