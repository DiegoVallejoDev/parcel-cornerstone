import Alpine from 'alpinejs';
import app from './stores/app.js';
import toasts from './stores/toasts.js';
import loading from './stores/loading.js';
import confirm from './stores/confirm.js';
import clipboard from './stores/clipboard.js';

Alpine.store('app', app);
Alpine.store('toasts', toasts);
Alpine.store('loading', loading);
Alpine.store('confirm', confirm);
Alpine.store('clipboard', clipboard);

const toastsStore = Alpine.store('toasts');
const loadingStore = Alpine.store('loading');
const confirmStore = Alpine.store('confirm');
const clipboardStore = Alpine.store('clipboard');

Alpine.data('counter', () => ({ count: 0 }));

Alpine.data('modal', () => ({ open: false }));

Alpine.data('toastItem', () => ({
    show: true,
    iconColor(type) {
        return (
            {
                success: 'text-green-500',
                info: 'text-blue-500',
                warning: 'text-yellow-500',
                error: 'text-red-500',
            }[type] || 'text-gray-500'
        );
    },
    iconPath(type) {
        return (
            {
                success: 'M5 13l4 4L19 7',
                info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                warning:
                    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
                error: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            }[type] || ''
        );
    },
}));

Alpine.data('dropdown', () => ({
    open: false,
    toggle() {
        this.open = !this.open;
    },
    close() {
        this.open = false;
    },
}));

Alpine.data('drawer', () => ({
    open: false,
    toggle() {
        this.open = !this.open;
    },
    close() {
        this.open = false;
    },
}));

Alpine.data('tooltip', () => ({
    visible: false,
    show() {
        this.visible = true;
    },
    hide() {
        this.visible = false;
    },
}));

Alpine.data('clipboard', () => ({
    text: '',
    successLabel: '',
    errorLabel: '',
    init() {
        this.successLabel = this.$el.dataset.successLabel;
        this.errorLabel = this.$el.dataset.errorLabel;
    },
    copy() {
        clipboardStore
            .copy(this.text)
            .then(() => toastsStore.add(this.successLabel, 'success'))
            .catch(() => toastsStore.add(this.errorLabel, 'error'));
    },
}));

Alpine.data('filter', () => ({
    query: '',
}));

Alpine.data('carousel', (initial = {}) => ({
    active: 0,
    count: initial.count || 0,
    interval: initial.interval || 0,
    timer: null,
    init() {
        if (this.interval > 0) {
            this.timer = window.setInterval(() => this.next(), this.interval);
        }
    },
    destroy() {
        if (this.timer) {
            window.clearInterval(this.timer);
        }
    },
    next() {
        this.active = (this.active + 1) % this.count;
    },
    prev() {
        this.active = (this.active - 1 + this.count) % this.count;
    },
}));

Alpine.data('scrollReveal', (initial = {}) => ({
    visible: false,
    threshold: initial.threshold || 0.2,
    init() {
        const observer = new window.IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        this.visible = true;
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: this.threshold },
        );
        observer.observe(this.$el);
    },
}));

Alpine.data('skeleton', () => ({
    active: false,
    loadingLabel: '',
    toggleLabel: '',
    init() {
        this.loadingLabel = this.$el.dataset.loadingLabel;
        this.toggleLabel = this.$el.dataset.toggleLabel;
    },
    toggle() {
        this.active = !this.active;
    },
}));

Alpine.data('confirmButton', () => ({
    message: '',
    success: '',
    init() {
        this.message = this.$el.dataset.message;
        this.success = this.$el.dataset.success;
    },
    openConfirm() {
        confirmStore.open(this.message, () =>
            toastsStore.add(this.success, 'success'),
        );
    },
}));

Alpine.data('loadingButton', () => ({
    message: '',
    done: '',
    init() {
        this.message = this.$el.dataset.message;
        this.done = this.$el.dataset.done;
    },
    showLoading() {
        loadingStore.show(this.message);
        window.setTimeout(() => {
            loadingStore.hide();
            toastsStore.add(this.done, 'success');
        }, 2000);
    },
}));

Alpine.start();
