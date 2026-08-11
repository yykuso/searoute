import { closeModal, isModalOpen, openModal } from './modalController.js';

export function initModalDialogs({ documentRef = document, locationRef = location } = {}) {
    const infoWindow = documentRef.getElementById('info-window');
    const privacyWindow = documentRef.getElementById('privacy-policy-window');
    const privacyOpenButton = documentRef.getElementById('privacy-policy-open-btn');
    const infoPrivacyButton = documentRef.getElementById('info-privacy-policy-btn');
    const infoCloseButton = documentRef.getElementById('info-close-top-btn');
    const privacyCloseButton = documentRef.getElementById('privacy-close-top-btn');

    privacyOpenButton?.addEventListener('click', () => {
        openModal(privacyWindow, { trigger: privacyOpenButton, focusCloseButton: true });
    });

    infoPrivacyButton?.addEventListener('click', () => {
        closeModal(infoWindow, { restoreFocus: false });
        openModal(privacyWindow, { trigger: infoPrivacyButton, focusCloseButton: true });
    });

    infoCloseButton?.addEventListener('click', () => closeModal(infoWindow));
    privacyCloseButton?.addEventListener('click', () => closeModal(privacyWindow));

    documentRef.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isModalOpen(privacyWindow)) {
            closeModal(privacyWindow);
        }
    });

    if (locationRef.hash === '#privacy') {
        openModal(privacyWindow, { focusCloseButton: true });
    }
}