<script lang="ts">
	import { AlertTriangle, Trash2, X } from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		title = 'Confirm Action',
		message = 'Are you sure you want to proceed with this action?',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		variant = 'danger',
		onConfirm
	}: {
		isOpen: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'danger' | 'warning' | 'primary';
		onConfirm: () => void | Promise<void>;
	} = $props();

	let isSubmitting = $state(false);

	async function handleConfirm() {
		isSubmitting = true;
		try {
			await onConfirm();
		} finally {
			isSubmitting = false;
			isOpen = false;
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200"
		role="dialog"
		aria-modal="true"
	>
		<div
			class="glass-panel w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-5 animate-scale-up"
		>
			<div class="flex items-start gap-4">
				<div
					class="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs {variant === 'danger' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-200 dark:border-rose-800' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}"
				>
					{#if variant === 'danger'}
						<Trash2 class="w-5 h-5" />
					{:else}
						<AlertTriangle class="w-5 h-5" />
					{/if}
				</div>

				<div class="flex-1 min-w-0">
					<div class="flex items-center justify-between">
						<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display">{title}</h3>
						<button
							type="button"
							onclick={() => (isOpen = false)}
							class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						>
							<X class="w-4 h-4" />
						</button>
					</div>
					<p class="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1.5 leading-relaxed">{message}</p>
				</div>
			</div>

			<div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
				<button
					type="button"
					onclick={() => (isOpen = false)}
					disabled={isSubmitting}
					class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs disabled:opacity-50"
				>
					{cancelText}
				</button>
				<button
					type="button"
					disabled={isSubmitting}
					onclick={handleConfirm}
					class="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50 {variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700 border border-rose-500 shadow-rose-500/20' : 'bg-purple-600 hover:bg-purple-700 border border-purple-500 shadow-purple-500/20'}"
				>
					{#if isSubmitting}
						<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
					{/if}
					<span>{confirmText}</span>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes scaleUp {
		from {
			opacity: 0;
			transform: scale(0.92);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	.animate-scale-up {
		animation: scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
</style>
