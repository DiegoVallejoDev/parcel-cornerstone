import app from './app';
import toasts from './toasts';

export default function registerStores(Alpine) {
    Alpine.store('app', app);
    Alpine.store('toasts', toasts);
}