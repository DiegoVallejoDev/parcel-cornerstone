import Alpine from 'alpinejs';
import app from './stores/app.js';
import toasts from './stores/toasts.js';

Alpine.store('app', app);
Alpine.store('toasts', toasts);

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

Alpine.start();
