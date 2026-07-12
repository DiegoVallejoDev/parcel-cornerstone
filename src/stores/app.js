export default {
    theme: localStorage.getItem('theme') || 'system',

    get isDark() {
        return (
            this.theme === 'dark' ||
            (this.theme === 'system' &&
                matchMedia('(prefers-color-scheme: dark)').matches)
        );
    },

    toggleTheme() {
        const cycle = { light: 'dark', dark: 'system', system: 'light' };
        this.theme = cycle[this.theme] || 'system';
        this._apply();
    },

    init() {
        this._apply();

        // React to OS theme changes while in 'system' mode
        matchMedia('(prefers-color-scheme: dark)').addEventListener(
            'change',
            () => {
                if (this.theme === 'system') this._apply();
            },
        );

        // Sync across tabs / language navigation
        window.addEventListener('storage', (e) => {
            if (e.key === 'theme') {
                this.theme = e.newValue || 'system';
                this._apply();
            }
        });
    },

    _apply() {
        document.documentElement.classList.toggle('dark', this.isDark);
        localStorage.setItem('theme', this.theme);
    },
};
