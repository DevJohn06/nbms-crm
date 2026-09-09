<script lang="ts">
	import { toastStore } from '$lib/toast.svelte';
	import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-svelte';

	function getTypeStyles(type: string) {
		switch (type) {
			case 'success':
				return {
					bg: 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-100',
					icon: CheckCircle2,
					iconColor: 'text-emerald-600 dark:text-emerald-400'
				};
			case 'error':
				return {
					bg: 'bg-rose-50/95 dark:bg-rose-950/90 border-rose-300 dark:border-rose-700/60 text-rose-950 dark:text-rose-100',
					icon: AlertCircle,
					iconColor: 'text-rose-600 dark:text-rose-400'
				};
			case 'warning':
				return {
					bg: 'bg-amber-50/95 dark:bg-amber-950/90 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-100',
					icon: AlertTriangle,
					iconColor: 'text-amber-600 dark:text-amber-400'
				};
			default:
				return {
					bg: 'bg-purple-50/95 dark:bg-purple-950/90 border-purple-300 dark:border-purple-700/60 text-purple-950 dark:text-purple-100',
					icon: Info,
					iconColor: 'text-purple-600 dark:text-purple-400'
				};
		}
	}
</script>

<div class="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
	{#each toastStore.toasts as toast (toast.id)}
		{@const styles = getTypeStyles(toast.type)}
		<div
			class="pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-200 animate-slide-in-right {styles.bg}"
			role="alert"
		>
			<styles.icon class="w-5 h-5 flex-shrink-0 mt-0.5 {styles.iconColor}" />
			<div class="flex-1 min-w-0">
				<p class="text-xs font-bold leading-tight">{toast.title}</p>
				{#if toast.message}
					<p class="text-[11px] opacity-90 mt-0.5 leading-snug font-medium break-words">{toast.message}</p>
				{/if}
			</div>
			<button
				type="button"
				onclick={() => toastStore.dismiss(toast.id)}
				class="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer flex-shrink-0"
				title="Close notification"
			>
				<X class="w-3.5 h-3.5" />
			</button>
		</div>
	{/each}
</div>

<style>
	@keyframes slideInRight {
		from {
			opacity: 0;
			transform: translateX(100%) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateX(0) scale(1);
		}
	}
	.animate-slide-in-right {
		animation: slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
</style>
