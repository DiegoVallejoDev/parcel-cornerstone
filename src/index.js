import Alpine from 'alpinejs';
import registerStores from './stores/index.js';

registerStores(Alpine);

Alpine.start();

console.log('[System] Cornerstone initialized.');