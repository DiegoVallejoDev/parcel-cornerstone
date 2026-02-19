import Alpine from 'alpinejs';

Alpine.store('darkMode', {
    on: document.documentElement.classList.contains('dark'),
    toggle() {
        this.on = !this.on;
        document.documentElement.classList.toggle('dark', this.on);
        localStorage.setItem('theme', this.on ? 'dark' : 'light');
    }
});

Alpine.start();

console.log('[System] Cornerstone initialized.');