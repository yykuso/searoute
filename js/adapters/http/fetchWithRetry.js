export async function fetchWithRetry(url, options = {}) {
    const {
        retries = 3,
        delay = 1000,
        fetchImpl = globalThis.fetch,
        wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    } = options;

    let lastError;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const response = await fetchImpl(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            lastError = error;
            if (attempt < retries - 1) {
                console.warn(`Fetch failed, retrying... (${attempt + 1}/${retries})`);
                await wait(delay);
            }
        }
    }

    throw lastError;
}