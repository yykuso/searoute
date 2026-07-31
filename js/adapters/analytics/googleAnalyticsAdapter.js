export function trackEvent(eventName, category, label, value = 1) {
    if (typeof gtag === 'function') {
        gtag('event', eventName, {
            event_category: category,
            event_label: label,
            value,
        });
    }
}
