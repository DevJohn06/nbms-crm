export interface ToastItem {
	id: string;
	type: 'success' | 'error' | 'info' | 'warning';
	title: string;
	message?: string;
	duration?: number;
}

let toasts = $state<ToastItem[]>([]);

export const toastStore = {
	get toasts() {
		return toasts;
	},

	add(type: ToastItem['type'], title: string, message?: string, duration = 4000) {
		const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
		const newItem: ToastItem = { id, type, title, message, duration };
		toasts = [...toasts, newItem];

		if (duration > 0) {
			setTimeout(() => {
				this.dismiss(id);
			}, duration);
		}

		return id;
	},

	dismiss(id: string) {
		toasts = toasts.filter((t) => t.id !== id);
	},

	success(title: string, message?: string, duration = 4000) {
		return this.add('success', title, message, duration);
	},

	error(title: string, message?: string, duration = 5000) {
		return this.add('error', title, message, duration);
	},

	info(title: string, message?: string, duration = 4000) {
		return this.add('info', title, message, duration);
	},

	warning(title: string, message?: string, duration = 4500) {
		return this.add('warning', title, message, duration);
	}
};
