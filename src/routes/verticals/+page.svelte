<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { navigating } from '$app/stores';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toastStore } from '$lib/toast.svelte';
	import {
		Layers,
		Plus,
		ExternalLink,
		Users,
		Edit3,
		Trash2,
		CheckCircle2,
		AlertCircle,
		RefreshCw,
		Loader2,
		X,
		Briefcase,
		TrendingUp,
		ArrowRight,
		Sliders
	} from 'lucide-svelte';

	let { data, form } = $props();

	let isRefreshing = $state(false);
	let isNavigating = $derived(!!$navigating);
	let isLoading = $derived(isRefreshing || isNavigating);

	async function refreshData() {
		isRefreshing = true;
		try {
			await invalidateAll();
		} finally {
			setTimeout(() => (isRefreshing = false), 350);
		}
	}

	// Create Modal State
	let showCreateModal = $state(false);
	let newName = $state('');
	let newSlug = $state('');
	let newDescription = $state('');
	let newSubdomain = $state('');

	function autoGenerateSlug(val: string) {
		newName = val;
		newSlug = val
			.toLowerCase()
			.trim()
			.replace(/\s+/g, '-')
			.replace(/[^\w\-]+/g, '')
			.replace(/\-\-+/g, '-')
			.replace(/^-+/, '')
			.replace(/-+$/, '');
	}

	// Edit Modal State
	let showEditModal = $state(false);
	let editId = $state('');
	let editName = $state('');
	let editDescription = $state('');
	let editSubdomain = $state('');

	function openEditModal(v: any) {
		editId = v.id;
		editName = v.name;
		editDescription = v.description || '';
		editSubdomain = v.subdomain || '';
		showEditModal = true;
	}

	// Delete Modal State
	let isDeleteConfirmOpen = $state(false);
	let verticalToDeleteId = $state<string | null>(null);
	let verticalToDeleteName = $state<string>('');

	function promptDeleteVertical(id: string, name: string) {
		verticalToDeleteId = id;
		verticalToDeleteName = name;
		isDeleteConfirmOpen = true;
	}

	async function confirmDeleteVertical() {
		if (!verticalToDeleteId) return;
		const id = verticalToDeleteId;
		verticalToDeleteId = null;

		isRefreshing = true;
		const form = new FormData();
		form.append('id', id);

		try {
			const res = await fetch('?/deleteVertical', { method: 'POST', body: form });
			const result = await res.json();
			await invalidateAll();
			if (result.type === 'success' || res.ok) {
				toastStore.success('Vertical Deleted', `Removed vertical "${verticalToDeleteName}".`);
			} else {
				toastStore.error('Delete Failed', 'Could not delete vertical.');
			}
		} catch (err) {
			console.error(err);
			toastStore.error('Delete Failed', 'An error occurred while deleting.');
		} finally {
			isRefreshing = false;
		}
	}

	function handleFormEnhance() {
		isRefreshing = true;
		return async ({ update, result }: { update: () => Promise<void>; result: any }) => {
			await update();
			isRefreshing = false;
			if (result.type === 'success') {
				showCreateModal = false;
				showEditModal = false;
				newName = '';
				newSlug = '';
				newDescription = '';
				newSubdomain = '';
				toastStore.success('Success', result.data?.message || 'Vertical operation completed.');
			} else if (result.type === 'failure') {
				toastStore.error('Operation Failed', result.data?.error || 'Failed to update vertical.');
			}
		};
	}

	let totalLeadsCount = $derived(
		data.verticalsList.reduce((sum: number, v: any) => sum + (v.leadsCount || 0), 0)
	);

	let activeVerticalSlug = $derived(data.activeVerticalParam || '');
</script>

<svelte:head>
	<title>Business Verticals & Funnels | NBMS CRM</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header Banner -->
	<div class="glass-panel p-6 rounded-2xl border border-[#dbe7f1] dark:border-sky-500/30 bg-gradient-to-r from-white via-sky-50 to-slate-50 dark:from-[#0a192f] dark:via-slate-900/60 dark:to-slate-950/80 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
		<div class="space-y-1 relative z-10">
			<div class="flex items-center gap-2">
				<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 flex items-center gap-1.5">
					<Layers class="w-3 h-3 text-[#1f71c1] dark:text-sky-400" />
					MULTI-VERTICAL CRM ARCHITECTURE
				</span>
				<span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-100 text-emerald-900 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
					Active Verticals: {data.verticalsList.length}
				</span>
			</div>
			<h1 class="text-2xl font-black tracking-tight font-display text-slate-900 dark:text-slate-100">Industry Verticals & Landing Pages</h1>
			<p class="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
				Group and isolate leads by market vertical, deploy dedicated public intake landing pages, and assign agent access permissions per vertical.
			</p>
		</div>

		<button
			onclick={() => (showCreateModal = true)}
			class="btn-primary flex items-center gap-2 text-xs py-2.5 px-4 shadow-md relative z-10"
		>
			<Plus class="w-4 h-4" />
			+ Create New Vertical
		</button>
	</div>

	<!-- Status Feedback Notifications -->
	{#if form?.error}
		<div class="p-4 rounded-xl bg-rose-100 text-rose-900 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30 text-xs flex items-center gap-3 font-bold shadow-xs animate-shake">
			<AlertCircle class="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
			<p>{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="p-4 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 text-xs flex items-center gap-3 font-bold shadow-xs">
			<CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
			<p>{form.message}</p>
		</div>
	{/if}

	<!-- Metric Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<div class="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-xs text-slate-500 dark:text-slate-400 font-bold">Total Verticals</p>
				<p class="text-2xl font-black text-slate-900 dark:text-slate-100 font-display mt-1">{data.verticalsList.length}</p>
			</div>
			<div class="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center font-bold">
				<Layers class="w-5 h-5" />
			</div>
		</div>

		<div class="glass-panel p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 shadow-xs flex items-center justify-between">
			<div>
				<p class="text-xs text-emerald-900 dark:text-emerald-300 font-bold">Total Grouped Leads</p>
				<p class="text-2xl font-black text-emerald-900 dark:text-emerald-200 font-display mt-1">{totalLeadsCount}</p>
			</div>
			<div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center font-bold">
				<TrendingUp class="w-5 h-5" />
			</div>
		</div>
	</div>

	<!-- Verticals List Cards -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Briefcase class="w-4 h-4 text-sky-600 dark:text-sky-400" />
				<h2 class="text-sm font-bold text-slate-900 dark:text-slate-200">Configured Business Verticals</h2>
			</div>

			<button
				type="button"
				onclick={refreshData}
				disabled={isLoading}
				class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
			>
				<RefreshCw class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 {isLoading ? 'animate-spin' : ''}" />
				<span>Refresh</span>
			</button>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each data.verticalsList as vertical (vertical.id)}
				<div class="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs hover:border-sky-300 dark:hover:border-sky-500/40 transition-all flex flex-col justify-between gap-4">
					<div class="space-y-3">
						<div class="flex items-start justify-between gap-2">
							<div>
								<div class="flex items-center gap-2 flex-wrap">
									<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display">{vertical.name}</h3>
									{#if vertical.slug === activeVerticalSlug || vertical.id === activeVerticalSlug}
										<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-100 text-sky-900 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40 flex items-center gap-1">
											<CheckCircle2 class="w-2.5 h-2.5" />
											Selected
										</span>
									{:else}
										<a
											href="?vertical={vertical.slug}"
											class="px-2 py-0.5 rounded-full text-[9px] font-semibold text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-colors"
											title="Filter view to {vertical.name}"
										>
											Select
										</a>
									{/if}
								</div>
								<p class="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">Slug: /{vertical.slug}</p>
							</div>

							<a
								href="/funnel/{vertical.slug}"
								target="_blank"
								rel="noopener noreferrer"
								class="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 text-[11px] font-bold hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-all flex items-center gap-1.5 shadow-xs flex-shrink-0"
								title="Open Public Landing Page"
							>
								<span>Live Landing Page</span>
								<ExternalLink class="w-3 h-3" />
							</a>
						</div>

						<p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
							{vertical.description || 'No description specified for this industry vertical.'}
						</p>

						<!-- Stats & Assigned Users -->
						<div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
							<a
								href="/leads?vertical={vertical.slug}"
								class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-sky-50 dark:hover:bg-sky-950/30 border border-slate-200/80 dark:border-slate-700/60 transition-colors flex items-center justify-between group"
							>
								<div>
									<p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Leads</p>
									<p class="text-base font-black text-slate-900 dark:text-slate-100 mt-0.5">{vertical.leadsCount || 0}</p>
								</div>
								<ArrowRight class="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
							</a>

							<div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
								<p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Assigned Users</p>
								<div class="flex items-center gap-1.5 mt-1 flex-wrap">
									<p class="text-sm font-black text-slate-900 dark:text-slate-100">{vertical.assignedUsersCount || 0}</p>
									{#if vertical.assignedUsers && vertical.assignedUsers.length > 0}
										<div class="flex items-center -space-x-1 overflow-hidden">
											{#each vertical.assignedUsers.slice(0, 3) as u}
												<span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold bg-sky-600 text-white border-2 border-white dark:border-slate-900" title="{u.name} ({u.role})">
													{u.name.charAt(0).toUpperCase()}
												</span>
											{/each}
											{#if vertical.assignedUsers.length > 3}
												<span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold bg-slate-400 text-white border-2 border-white dark:border-slate-900">
													+{vertical.assignedUsers.length - 3}
												</span>
											{/if}
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<!-- Bottom Actions -->
					<div class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/60 gap-2">
						<a
							href="/cms/intake?vertical={vertical.slug}"
							class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
						>
							<Sliders class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
							Edit Landing Page CMS
						</a>

						<div class="flex items-center gap-1.5">
							<button
								type="button"
								onclick={() => openEditModal(vertical)}
								class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
								title="Edit vertical details"
							>
								<Edit3 class="w-4 h-4" />
							</button>

							<button
								type="button"
								onclick={() => promptDeleteVertical(vertical.id, vertical.name)}
								disabled={(vertical.leadsCount || 0) > 0}
								class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
								title={(vertical.leadsCount || 0) > 0 ? 'Cannot delete vertical containing leads' : 'Delete vertical'}
							>
								<Trash2 class="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Modal: Create New Vertical -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
		<div class="glass-panel w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4">
			<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 flex items-center justify-center font-bold">
						<Layers class="w-4 h-4" />
					</div>
					<div>
						<h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">Create Industry Vertical</h3>
						<p class="text-[11px] text-slate-500">Deploys isolated lead grouping & an automated landing page funnel</p>
					</div>
				</div>

				<button onclick={() => (showCreateModal = false)} class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
					<X class="w-4 h-4" />
				</button>
			</div>

			<form method="POST" action="?/createVertical" use:enhance={handleFormEnhance} class="space-y-3.5">
				<div>
					<label for="create_vertical_name" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Vertical Name *</label>
					<input
						id="create_vertical_name"
						type="text"
						name="name"
						required
						placeholder="e.g. E-Commerce & Retail, Tattoo Shops, Firearms"
						value={newName}
						oninput={(e) => autoGenerateSlug(e.currentTarget.value)}
						class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-sky-500 font-semibold"
					/>
				</div>

				<div>
					<label for="create_vertical_slug" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Landing Page URL Slug *</label>
					<div class="flex items-center gap-1 text-xs">
						<span class="px-2.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-700 font-mono text-[11px]">
							/funnel/
						</span>
						<input
							id="create_vertical_slug"
							type="text"
							name="slug"
							required
							bind:value={newSlug}
							placeholder="ecommerce-retail"
							class="w-full text-xs px-3 py-2 rounded-r-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-sky-500 font-mono text-[11px]"
						/>
					</div>
					<p class="text-[10px] text-slate-400 mt-1">This forms the public funnel address where merchants in this vertical apply.</p>
				</div>

				<div>
					<label for="create_vertical_desc" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description / Market Focus</label>
					<textarea
						id="create_vertical_desc"
						name="description"
						rows="2"
						bind:value={newDescription}
						placeholder="High-risk and specialty payment processing for online merchants, card-not-present checkouts..."
						class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-sky-500"
					></textarea>
				</div>

				<div>
					<label for="create_vertical_subdomain" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Optional Custom Subdomain</label>
					<input
						id="create_vertical_subdomain"
						type="text"
						name="subdomain"
						bind:value={newSubdomain}
						placeholder="e.g. ecom (for ecom.nbmsinc.com)"
						class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-sky-500 font-mono text-[11px]"
					/>
				</div>

				<div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
					<button
						type="button"
						onclick={() => (showCreateModal = false)}
						class="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isLoading}
						class="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md"
					>
						{#if isLoading}
							<Loader2 class="w-3.5 h-3.5 animate-spin" />
							<span>Creating...</span>
						{:else}
							<Plus class="w-3.5 h-3.5" />
							<span>Create Vertical & Launch Funnel</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Edit Vertical -->
{#if showEditModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
		<div class="glass-panel w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4">
			<div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 flex items-center justify-center font-bold">
						<Edit3 class="w-4 h-4" />
					</div>
					<div>
						<h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">Edit Industry Vertical</h3>
						<p class="text-[11px] text-slate-500">Update vertical naming and metadata</p>
					</div>
				</div>

				<button onclick={() => (showEditModal = false)} class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
					<X class="w-4 h-4" />
				</button>
			</div>

			<form method="POST" action="?/updateVertical" use:enhance={handleFormEnhance} class="space-y-3.5">
				<input type="hidden" name="id" value={editId} />

				<div>
					<label for="edit_vertical_name" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Vertical Name *</label>
					<input
						id="edit_vertical_name"
						type="text"
						name="name"
						required
						bind:value={editName}
						class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-sky-500 font-semibold"
					/>
				</div>

				<div>
					<label for="edit_vertical_desc" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description / Market Focus</label>
					<textarea
						id="edit_vertical_desc"
						name="description"
						rows="2"
						bind:value={editDescription}
						class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-sky-500"
					></textarea>
				</div>

				<div>
					<label for="edit_vertical_subdomain" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Custom Subdomain</label>
					<input
						id="edit_vertical_subdomain"
						type="text"
						name="subdomain"
						bind:value={editSubdomain}
						placeholder="e.g. dispensary"
						class="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-sky-500 font-mono text-[11px]"
					/>
				</div>

				<div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
					<button
						type="button"
						onclick={() => (showEditModal = false)}
						class="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isLoading}
						class="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-md"
					>
						{#if isLoading}
							<Loader2 class="w-3.5 h-3.5 animate-spin" />
							<span>Saving...</span>
						{:else}
							<span>Save Changes</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<ConfirmModal
	bind:isOpen={isDeleteConfirmOpen}
	title="Delete Business Vertical?"
	message={`Are you sure you want to permanently delete the vertical "${verticalToDeleteName}"? This action cannot be undone.`}
	confirmText="Delete Vertical"
	cancelText="Keep Vertical"
	variant="danger"
	onConfirm={confirmDeleteVertical}
/>
