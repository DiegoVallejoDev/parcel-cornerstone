export default {
    async copy(text) {
        if (!window.navigator.clipboard) {
            throw new Error('Clipboard API not available');
        }
        await window.navigator.clipboard.writeText(text);
    },
};
