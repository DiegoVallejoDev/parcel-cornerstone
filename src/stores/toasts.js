export default {
    items: [],

    add(message, type = 'info', duration = 3000) {
        const id = Date.now();
        this.items.push({ id, message, type });
        setTimeout(() => this.remove(id), duration);
    },

    remove(id) {
        this.items = this.items.filter((item) => item.id !== id);
    },
};
