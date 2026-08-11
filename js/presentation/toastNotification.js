export function showToast(message, { documentRef = document } = {}) {
    const toast = documentRef.createElement('div');
    toast.textContent = message;
    toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-[9999] opacity-0 transition-opacity duration-300';
    documentRef.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}