export default {
    isOpen: false,
    message: '',
    onConfirm: null,
    onCancel: null,

    open(message, onConfirm, onCancel) {
        this.message = message;
        this.onConfirm = onConfirm || null;
        this.onCancel = onCancel || null;
        this.isOpen = true;
    },

    confirm() {
        this.isOpen = false;
        if (this.onConfirm) this.onConfirm();
        this._reset();
    },

    cancel() {
        this.isOpen = false;
        if (this.onCancel) this.onCancel();
        this._reset();
    },

    _reset() {
        this.message = '';
        this.onConfirm = null;
        this.onCancel = null;
    },
};
