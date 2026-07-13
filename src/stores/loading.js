export default {
    active: false,
    message: '',

    show(message = '') {
        this.active = true;
        this.message = message;
    },

    hide() {
        this.active = false;
        this.message = '';
    },

    async run(promise, message = '') {
        this.show(message);
        try {
            return await promise;
        } finally {
            this.hide();
        }
    },
};
