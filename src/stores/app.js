export default {
    theme: localStorage.getItem('theme') || 'system',

    get isDark() {
        return this.theme === 'dark' ||
            (this.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    },

    toggleTheme() {
        this.theme = this.isDark ? 'light' : 'dark';
        this._apply();
    },

    init() { this._apply(); },

    _apply() {
        document.documentElement.classList.toggle('dark', this.isDark);
        localStorage.setItem('theme', this.theme);
    },
};