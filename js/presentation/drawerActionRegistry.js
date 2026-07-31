const handlers = new Map();
const closeHandlers = new Set();

export function registerDrawerAction(action, handler) {
    handlers.set(action, handler);
    return () => handlers.delete(action);
}

export function executeDrawerAction(action, payload = {}) {
    const handler = handlers.get(action);
    if (!handler) {
        return false;
    }

    handler(payload);
    return true;
}

export function registerDrawerCloseHandler(handler) {
    closeHandlers.add(handler);
    return () => closeHandlers.delete(handler);
}

export function executeDrawerCloseHandlers() {
    closeHandlers.forEach(handler => handler());
}