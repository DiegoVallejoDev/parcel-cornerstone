export default {
    lang: document.documentElement.lang || 'es',
    theme: localStorage.getItem('theme') || 'system',
    scrollY: 0,

    init() {
        // Apply theme on load
        this.applyTheme();
    },

    get isDark() {
        if (this.theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return this.theme === 'dark';
    },

    toggleTheme() {
        if (this.theme === 'system') {
            this.theme = this.isDark ? 'light' : 'dark';
        } else {
            this.theme = this.theme === 'dark' ? 'light' : 'dark';
        }
        this.applyTheme();
    },

    applyTheme() {
        if (this.theme === 'dark' || (this.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', this.theme);
    },

    saveBefore(navigate) {
        this.scrollY = window.scrollY;
        localStorage.setItem('appState', JSON.stringify({ scrollY: this.scrollY }));
        if (typeof navigate === 'function') navigate();
    },

    restoreAfter() {
        const saved = JSON.parse(localStorage.getItem('appState') || '{}');
        if (saved.scrollY) window.scrollTo(0, saved.scrollY);
    }
};