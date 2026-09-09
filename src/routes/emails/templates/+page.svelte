<script lang="ts">
	import type { PageData } from './$types';
	import { Layers, Plus, Trash2, Edit3, Code, Sparkles, CheckCircle2, X } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let isModalOpen = $state(false);
	let editingId = $state<number | null>(null);

	let tmplName = $state('');
	let tmplSubject = $state('');
	let tmplBody = $state('');
	let tmplTrigger = $state('');

	function openCreateModal() {
		editingId = null;
		tmplName = '';
		tmplSubject = '';
		tmplBody = '';
		tmplTrigger = '';
		isModalOpen = true;
	}

	function openEditModal(tmpl: any) {
		editingId = tmpl.id;
		tmplName = tmpl.name;
		tmplSubject = tmpl.subject;
		tmplBody = tmpl.bodyHtml;
		tmplTrigger = tmpl.triggerStage || '';
		isModalOpen = true;
	}

	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toastStore } from '$lib/toast.svelte';
	import { invalidateAll } from '$app/navigation';

	let isDeleteConfirmOpen = $state(false);
	let templateToDeleteId = $state<number | null>(null);

	function promptDeleteTemplate(id: number) {
		templateToDeleteId = id;
		isDeleteConfirmOpen = true;
	}

	async function confirmDeleteTemplate() {
		if (!templateToDeleteId) return;
		const id = templateToDeleteId;
		templateToDeleteId = null;

		const form = new FormData();
		form.append('id', String(id));
		try {
			await fetch('?/deleteTemplate', { method: 'POST', body: form });
			await invalidateAll();
			toastStore.success('Template Deleted', 'Email automation template removed.');
		} catch (err) {
			console.error(err);
			toastStore.error('Delete Failed', 'Could not delete email template.');
		}
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
				<Layers class="w-6 h-6 text-purple-600 dark:text-purple-400" />
				Custom Drip Scripts & Email Templates
			</h2>
			<p class="text-slate-600 dark:text-slate-400 text-xs mt-1">
				Configure reusable message scripts with dynamic tags (<code>{"{{businessName}}"}</code>, <code>{"{{funnelLink}}"}</code>).
			</p>
		</div>

		<button onclick={openCreateModal} class="btn-primary text-xs flex items-center gap-2 shadow-sm">
			<Plus class="w-4 h-4" />
			Create New Script Template
		</button>
	</div>

	<!-- Variable Tags Cheat Sheet -->
	<div class="glass-panel p-4 rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50 dark:bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
		<div class="flex items-center gap-2">
			<Code class="w-4 h-4 text-purple-700 dark:text-purple-400 flex-shrink-0" />
			<span class="font-bold text-purple-900 dark:text-purple-200">Available Script Variables:</span>
		</div>
		<div class="flex flex-wrap gap-2 text-[11px] font-mono">
			<span class="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-700 text-purple-800 dark:text-purple-300 font-bold shadow-xs">{"{{businessName}}"}</span>
			<span class="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-cyan-200 dark:border-slate-700 text-cyan-800 dark:text-cyan-300 font-bold shadow-xs">{"{{email}}"}</span>
			<span class="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 text-amber-800 dark:text-amber-300 font-bold shadow-xs">{"{{phone}}"}</span>
			<span class="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs">{"{{funnelLink}}"}</span>
		</div>
	</div>

	<!-- Templates Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each data.templates as tmpl}
			<div class="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex flex-col justify-between space-y-4 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all">
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
							TEMPLATE #{tmpl.id}
						</span>
						{#if tmpl.triggerStage}
							<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30">
								Auto: {tmpl.triggerStage}
							</span>
						{/if}
					</div>

					<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display">{tmpl.name}</h3>
					<p class="text-xs font-semibold text-purple-700 dark:text-purple-300 truncate">Subject: {tmpl.subject}</p>
					<div class="text-xs text-slate-700 dark:text-slate-400 line-clamp-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200 dark:border-slate-900 font-mono">
						{@html tmpl.bodyHtml}
					</div>
				</div>

				<div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
					<button
						onclick={() => openEditModal(tmpl)}
						class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-purple-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
					>
						<Edit3 class="w-3.5 h-3.5" />
						Edit
					</button>

					<button
						onclick={() => promptDeleteTemplate(tmpl.id)}
						class="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
						title="Delete Template"
					>
						<Trash2 class="w-3.5 h-3.5" />
					</button>
				</div>
			</div>
		{:else}
			<div class="col-span-full p-12 text-center text-slate-500 text-sm glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
				No email templates created. Click "Create New Script Template" to add your first template.
			</div>
		{/each}
	</div>
</div>

{#if isModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
		<div class="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
					{editingId ? 'Edit Script Template' : 'Create Script Template'}
				</h3>
				<button onclick={() => (isModalOpen = false)} class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
					<X class="w-5 h-5" />
				</button>
			</div>

			<form method="POST" action="?/saveTemplate" class="space-y-4">
				{#if editingId}
					<input type="hidden" name="id" value={editingId} />
				{/if}

				<div class="space-y-1.5">
					<label for="name" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Template Name *</label>
					<input id="name" name="name" required bind:value={tmplName} placeholder="Welcome & Introduction" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-none" />
				</div>

				<div class="space-y-1.5">
					<label for="subject" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Subject Line *</label>
					<input id="subject" name="subject" required bind:value={tmplSubject} placeholder="Exclusive Partnership Opportunity with NBMS" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#1f71c1] focus:outline-none" />
				</div>

				<div class="space-y-1.5">
					<label for="triggerStage" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Automatic Trigger Stage (Optional)</label>
					<select id="triggerStage" name="triggerStage" bind:value={tmplTrigger} class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#1f71c1] focus:outline-none">
						<option value="">None (Manual Send)</option>
						<option value="NEW">Stage 1: NEW</option>
						<option value="EMAILED">Stage 2: EMAILED</option>
						<option value="CONTACTED">Stage 3: CONTACTED</option>
					</select>
				</div>

				<div class="space-y-1.5">
					<label for="bodyHtml" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Email Body HTML *</label>
					<textarea id="bodyHtml" name="bodyHtml" rows="6" required bind:value={tmplBody} placeholder="<p>Hi Merchant,</p><p>Welcome to NBMS!</p>" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:border-[#1f71c1] focus:outline-none font-mono"></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-2">
					<button type="button" onclick={() => (isModalOpen = false)} class="btn-secondary text-xs cursor-pointer">Cancel</button>
					<button type="submit" class="btn-primary text-xs cursor-pointer">Save Template</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<ConfirmModal
	bind:isOpen={isDeleteConfirmOpen}
	title="Delete Email Template?"
	message="Are you sure you want to delete this email automation template script?"
	confirmText="Delete Template"
	variant="danger"
	onConfirm={confirmDeleteTemplate}
/>
