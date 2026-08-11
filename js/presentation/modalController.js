const modalTriggers = new WeakMap();

export function openModal(modal, { trigger = null, focusCloseButton = false } = {}) {
    if (!modal) return false;

    modalTriggers.set(modal, trigger || globalThis.document?.activeElement || null);
    modal.style.display = 'block';
    modal.scrollTop = 0;

    if (focusCloseButton) {
        modal.querySelector('.modal-close-btn')?.focus();
    }

    return true;
}

export function closeModal(modal, { restoreFocus = true } = {}) {
    if (!modal) return false;

    modal.style.display = 'none';
    modal.dispatchEvent?.(new Event('modalclose'));
    const trigger = modalTriggers.get(modal);
    if (restoreFocus && trigger?.offsetParent !== null && typeof trigger?.focus === 'function') {
        trigger.focus();
    }

    return true;
}

export function isModalOpen(modal) {
    return Boolean(modal && modal.style.display !== 'none');
}