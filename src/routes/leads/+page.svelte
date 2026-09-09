<script lang="ts">
	import type { PageData } from './$types';
	import {
		Users,
		Search,
		Filter,
		UploadCloud,
		Plus,
		Mail,
		Phone,
		Building,
		Trash2,
		ChevronRight,
		ChevronLeft,
		Layers,
		Kanban,
		Table,
		CheckCircle2,
		Sparkles,
		FileText,
		GripVertical,
		ArrowRight,
		X,
		Copy,
		Check,
		RefreshCw,
		Loader2
	} from 'lucide-svelte';
	import LeadImporterModal from '$lib/components/LeadImporterModal.svelte';
	import LeadDetailModal from '$lib/components/LeadDetailModal.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toastStore } from '$lib/toast.svelte';
	import { page, navigating } from '$app/stores';
	import { invalidateAll, goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let isRefreshing = $state(false);
	let isSearchFiltering = $state(false);
	let isNavigating = $derived(!!$navigating);
	let isLoading = $derived(isRefreshing || isNavigating || isSearchFiltering);

	async function refreshData() {
		isRefreshing = true;
		try {
			await invalidateAll();
		} finally {
			setTimeout(() => (isRefreshing = false), 350);
		}
	}


	let copiedText = $state<string | null>(null);

	function copyToClipboard(text: string) {
		if (!text || text === 'No email address' || text === 'N/A') return;
		navigator.clipboard.writeText(text);
		copiedText = text;
		setTimeout(() => (copiedText = null), 2500);
	}

	let isImporterOpen = $state($page.url.searchParams.get('import') === 'true');
	let isAddModalOpen = $state(false);
	let selectedLead = $state<any>(null);
	let isDetailOpen = $state(false);

	let viewMode = $state<'kanban' | 'table'>('table');
	let searchQuery = $state('');
	let debouncedSearchQuery = $state('');
	let searchByField = $state<'all' | 'business' | 'email' | 'phone'>('all');
	let statusFilter = $state('ALL');
	let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	function handleSearchInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		searchQuery = val;
		isSearchFiltering = true;

		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(() => {
			debouncedSearchQuery = val;
			isSearchFiltering = false;
		}, 120);
	}

	function handleSearchFieldChange() {
		isSearchFiltering = true;
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(() => {
			debouncedSearchQuery = searchQuery;
			isSearchFiltering = false;
		}, 80);
	}

	function clearSearch() {
		searchQuery = '';
		debouncedSearchQuery = '';
		isSearchFiltering = false;
		if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
	}

	const searchFieldPlaceholder = $derived.by(() => {
		switch (searchByField) {
			case 'business':
				return 'Search by Business Name...';
			case 'email':
				return 'Search by Email Address...';
			case 'phone':
				return 'Search by Phone Number...';
			default:
				return 'Search Business, Email, or Phone...';
		}
	});

	// Search & Move Lead Modal state (for non-NEW columns)
	let isMoveSearchOpen = $state(false);
	let moveTargetStage = $state<string>('EMAILED');
	let moveSearchQuery = $state('');

	// Local reactive state for real-time instant Drag & Drop & Move updates
	let leadsList = $state<any[]>([]);

	// Drag & Drop State
	let draggedLeadId = $state<number | null>(null);
	let dragOverColumn = $state<string | null>(null);

	$effect(() => {
		searchQuery = data.searchQuery || '';
		debouncedSearchQuery = data.searchQuery || '';
		statusFilter = data.statusFilter || 'ALL';
		leadsList = [...(data.leads || [])];
	});

	// Form bindings for single new lead
	let newName = $state('');
	let newEmail = $state('');
	let newPhone = $state('');
	let newStatus = $state('NEW');
	let newNotes = $state('');

	const statusOptions = [
		{ id: 'ALL', label: 'All Journey Stages' },
		{ id: 'NEW', label: '1. New Import' },
		{ id: 'EMAILED', label: '2. Emailed' },
		{ id: 'CONTACTED', label: '3. Contacted' },
		{ id: 'CONTRACT_SENT', label: '4. Contract Sent' },
		{ id: 'CONTRACT_SIGNED', label: '5. Signed Contract' },
		{ id: 'LOST', label: 'Lost' }
	];

	const kanbanColumns = [
		{
			id: 'NEW',
			title: '1. New Import',
			color: 'blue',
			border: 'border-blue-200 dark:border-blue-500/30',
			bg: 'bg-blue-50/80 dark:bg-blue-950/20',
			headerBg: 'bg-blue-100 text-blue-950 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
			badge: 'bg-blue-200 text-blue-900 dark:bg-blue-500/20 dark:text-blue-300'
		},
		{
			id: 'EMAILED',
			title: '2. Emailed',
			color: 'purple',
			border: 'border-purple-200 dark:border-purple-500/30',
			bg: 'bg-purple-50/80 dark:bg-purple-950/20',
			headerBg: 'bg-purple-100 text-purple-950 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30',
			badge: 'bg-purple-200 text-purple-900 dark:bg-purple-500/20 dark:text-purple-300'
		},
		{
			id: 'CONTACTED',
			title: '3. Contacted',
			color: 'amber',
			border: 'border-amber-200 dark:border-amber-500/30',
			bg: 'bg-amber-50/80 dark:bg-amber-950/20',
			headerBg: 'bg-amber-100 text-amber-950 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
			badge: 'bg-amber-200 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
		},
		{
			id: 'CONTRACT_SENT',
			title: '4. Contract Sent',
			color: 'indigo',
			border: 'border-indigo-200 dark:border-indigo-500/30',
			bg: 'bg-indigo-50/80 dark:bg-indigo-950/20',
			headerBg: 'bg-indigo-100 text-indigo-950 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30',
			badge: 'bg-indigo-200 text-indigo-900 dark:bg-indigo-500/20 dark:text-indigo-300'
		},
		{
			id: 'CONTRACT_SIGNED',
			title: '5. Signed Contract',
			color: 'emerald',
			border: 'border-emerald-200 dark:border-emerald-500/30',
			bg: 'bg-emerald-50/80 dark:bg-emerald-950/20',
			headerBg: 'bg-emerald-100 text-emerald-950 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
			badge: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300'
		},
		{
			id: 'LOST',
			title: 'Lost Lead',
			color: 'rose',
			border: 'border-rose-200 dark:border-rose-500/30',
			bg: 'bg-rose-50/80 dark:bg-rose-950/20',
			headerBg: 'bg-rose-100 text-rose-950 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
			badge: 'bg-rose-200 text-rose-900 dark:bg-rose-500/20 dark:text-rose-300'
		}
	];

	function getStatusClass(st: string) {
		switch (st) {
			case 'NEW':
				return 'bg-blue-100 text-blue-950 border-blue-400 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-500/50';
			case 'EMAILED':
				return 'bg-purple-100 text-purple-950 border-purple-400 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-500/50';
			case 'CONTACTED':
				return 'bg-amber-100 text-amber-950 border-amber-500 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-500/50';
			case 'FUNNEL_COMPLETED':
				return 'bg-cyan-100 text-cyan-950 border-cyan-400 dark:bg-cyan-950/80 dark:text-cyan-200 dark:border-cyan-500/50';
			case 'CONTRACT_SENT':
				return 'bg-indigo-100 text-indigo-950 border-indigo-400 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-500/50';
			case 'CONTRACT_SIGNED':
				return 'bg-emerald-100 text-emerald-950 border-emerald-500 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-500/50';
			case 'LOST':
				return 'bg-rose-100 text-rose-950 border-rose-400 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-500/50';
			default:
				return 'bg-slate-100 text-slate-950 border-slate-400 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700';
		}
	}

	function getTargetStageLabel(stageId: string) {
		const col = kanbanColumns.find((c) => c.id === stageId);
		return col ? col.title : stageId;
	}

	let filteredLeads = $derived.by(() => {
		let list = leadsList;

		if (statusFilter && statusFilter !== 'ALL') {
			list = list.filter((l) => l.status === statusFilter);
		}

		const q = debouncedSearchQuery.toLowerCase().trim();
		if (q) {
			list = list.filter((l) => {
				if (searchByField === 'business') {
					return !!(l.businessName && l.businessName.toLowerCase().includes(q));
				} else if (searchByField === 'email') {
					return !!(l.email && l.email.toLowerCase().includes(q));
				} else if (searchByField === 'phone') {
					return !!(l.phone && l.phone.toLowerCase().includes(q));
				} else {
					return !!(
						(l.businessName && l.businessName.toLowerCase().includes(q)) ||
						(l.email && l.email.toLowerCase().includes(q)) ||
						(l.phone && l.phone.toLowerCase().includes(q)) ||
						(l.notes && l.notes.toLowerCase().includes(q))
					);
				}
			});
		}

		return list;
	});

	let moveSearchFiltered = $derived.by(() => {
		let list = leadsList.filter((l) => l.status !== moveTargetStage);
		if (!moveSearchQuery.trim()) return list;
		const q = moveSearchQuery.toLowerCase();
		return list.filter(
			(l) =>
				l.businessName.toLowerCase().includes(q) ||
				l.email.toLowerCase().includes(q) ||
				l.phone.toLowerCase().includes(q)
		);
	});

	async function moveLeadToStage(leadId: number) {
		await updateLeadStatus(leadId, moveTargetStage);
		isMoveSearchOpen = false;
		moveSearchQuery = '';
	}

	async function updateLeadStatus(id: number, newSt: string) {
		isRefreshing = true;
		// Instantly update local reactive state for 0ms lag
		leadsList = leadsList.map((lead) => {
			if (lead.id === id) {
				return { ...lead, status: newSt };
			}
			return lead;
		});

		const form = new FormData();
		form.append('id', String(id));
		form.append('status', newSt);
		try {
			await fetch('/leads?/updateStatus', { method: 'POST', body: form });
			toastStore.info('Stage Updated', `Lead status updated to ${newSt.replace('_', ' ')}.`);
		} catch (err) {
			console.error('Failed to update lead status:', err);
			toastStore.error('Update Failed', 'Could not update lead stage.');
		} finally {
			setTimeout(() => (isRefreshing = false), 250);
		}
	}

	let isDeleteConfirmOpen = $state(false);
	let leadToDeleteId = $state<number | null>(null);

	function promptDeleteLead(id: number) {
		leadToDeleteId = id;
		isDeleteConfirmOpen = true;
	}

	async function confirmDeleteLead() {
		if (!leadToDeleteId) return;
		const id = leadToDeleteId;
		leadToDeleteId = null;

		isRefreshing = true;
		leadsList = leadsList.filter((l) => l.id !== id);

		const form = new FormData();
		form.append('id', String(id));
		try {
			await fetch('/leads?/deleteLead', { method: 'POST', body: form });
			toastStore.success('Lead Deleted', 'Merchant lead permanently removed.');
		} catch (err) {
			console.error('Failed to delete lead:', err);
			toastStore.error('Delete Failed', 'Could not delete merchant lead.');
		} finally {
			setTimeout(() => (isRefreshing = false), 250);
		}
	}

	function handleSearch() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('q', searchQuery);
		else url.searchParams.delete('q');

		if (statusFilter && statusFilter !== 'ALL') url.searchParams.set('status', statusFilter);
		else url.searchParams.delete('status');

		goto(url.toString(), { keepFocus: true, replaceState: true });
	}

	// Drag & Drop event handlers
	function handleDragStart(e: DragEvent, leadId: number) {
		draggedLeadId = leadId;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(leadId));
		}
	}

	function handleDragOver(e: DragEvent, columnId: string) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dragOverColumn = columnId;
	}

	function handleDragLeave(e: DragEvent) {
		dragOverColumn = null;
	}

	async function handleDrop(e: DragEvent, columnId: string) {
		e.preventDefault();
		dragOverColumn = null;
		if (!draggedLeadId) return;

		const targetId = draggedLeadId;
		draggedLeadId = null;
		await updateLeadStatus(targetId, columnId);
	}

	let kanbanContainerRef = $state<HTMLDivElement | null>(null);

	function scrollKanban(direction: 'left' | 'right') {
		if (!kanbanContainerRef) return;
		const amount = direction === 'left' ? -320 : 320;
		kanbanContainerRef.scrollBy({ left: amount, behavior: 'smooth' });
	}

	const orderStages = ['NEW', 'EMAILED', 'CONTACTED', 'CONTRACT_SENT', 'CONTRACT_SIGNED', 'LOST'];

	function getNextStage(current: string): string | null {
		const idx = orderStages.indexOf(current);
		if (idx >= 0 && idx < orderStages.length - 1) return orderStages[idx + 1];
		return null;
	}

	function getPrevStage(current: string): string | null {
		const idx = orderStages.indexOf(current);
		if (idx > 0) return orderStages[idx - 1];
		return null;
	}
</script>

<div class="space-y-6">
	<!-- Page Header & Action Buttons -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
				<Users class="w-6 h-6 text-purple-600 dark:text-purple-400" />
				Lead Journey Pipeline
			</h2>
			<p class="text-slate-600 dark:text-slate-400 text-xs mt-1">
				Drag & drop merchant leads across stages, trigger automated emails, and track contract progress.
			</p>
		</div>

		<div class="flex items-center gap-3">
			<!-- View Mode Selector Toggle -->
			<div class="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-xs">
				<button
					onclick={() => (viewMode = 'table')}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all {viewMode === 'table' ? 'bg-white text-purple-900 border border-purple-300 shadow-xs dark:bg-purple-600/30 dark:text-purple-200 dark:border-purple-500/40' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
				>
					<Table class="w-3.5 h-3.5" />
					Table View
				</button>

				<button
					onclick={() => (viewMode = 'kanban')}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all {viewMode === 'kanban' ? 'bg-white text-purple-900 border border-purple-300 shadow-xs dark:bg-purple-600/30 dark:text-purple-200 dark:border-purple-500/40' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}"
				>
					<Kanban class="w-3.5 h-3.5" />
					Kanban Board
				</button>
			</div>

			<button
				onclick={() => (isImporterOpen = true)}
				class="btn-secondary text-xs flex items-center gap-2 shadow-xs"
			>
				<UploadCloud class="w-4 h-4 text-purple-600 dark:text-purple-400" />
				Upload CSV
			</button>

			<button
				onclick={() => (isAddModalOpen = true)}
				class="btn-primary text-xs flex items-center gap-2 shadow-sm"
			>
				<Plus class="w-4 h-4" />
				Add Lead
			</button>
		</div>
	</div>

	<!-- Filter & Search Control Panel -->
	<div class="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
		<div class="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
			<!-- Search Input & Search By Field Selector Group -->
			<div class="flex items-center gap-2 w-full md:w-auto flex-1 md:max-w-md">
				<div class="relative w-full">
					<Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
					<input
						type="text"
						placeholder={searchFieldPlaceholder}
						value={searchQuery}
						oninput={handleSearchInput}
						class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-purple-600 focus:outline-none shadow-xs"
					/>
					{#if searchQuery}
						<button
							type="button"
							onclick={clearSearch}
							class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
							title="Clear search"
						>
							<X class="w-3.5 h-3.5" />
						</button>
					{/if}
				</div>

				<select
					bind:value={searchByField}
					onchange={handleSearchFieldChange}
					class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-purple-600 focus:outline-none shadow-xs font-semibold cursor-pointer whitespace-nowrap"
					title="Filter search field"
				>
					<option value="all">Search By: All Fields</option>
					<option value="business">Search By: Business Name</option>
					<option value="email">Search By: Email</option>
					<option value="phone">Search By: Phone</option>
				</select>
			</div>

			<select
				bind:value={statusFilter}
				onchange={handleSearch}
				class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-purple-600 focus:outline-none shadow-xs font-semibold"
			>
				{#each statusOptions as opt}
					<option value={opt.id}>{opt.label}</option>
				{/each}
			</select>

			<button
				type="button"
				onclick={refreshData}
				disabled={isLoading}
				class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs disabled:opacity-50"
				title="Refresh lead table data"
			>
				<RefreshCw class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 {isLoading ? 'animate-spin' : ''}" />
				<span class="hidden sm:inline">Refresh</span>
			</button>
		</div>

		<div class="flex items-center gap-3">
			{#if isLoading}
				<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 animate-pulse">
					<Loader2 class="w-3.5 h-3.5 animate-spin text-purple-600 dark:text-purple-400" />
					Loading...
				</span>
			{/if}

			<div class="text-xs text-slate-500 dark:text-slate-400 font-medium">
				Showing <span class="text-purple-700 dark:text-purple-300 font-bold">{filteredLeads.length}</span> of {data.totalLeads} total leads
			</div>
		</div>
	</div>

	<!-- MAIN KANBAN BOARD VIEW -->
	{#if viewMode === 'kanban'}
		<div class="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
			<span class="font-bold text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
				<Sparkles class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Lead Journey Board (Scroll Horizontally)
			</span>
			<div class="flex items-center gap-1.5">
				<button
					onclick={() => scrollKanban('left')}
					class="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-white hover:border-purple-300 dark:hover:border-purple-500/40 shadow-xs transition-colors"
					title="Scroll Kanban Left"
				>
					<ChevronLeft class="w-4 h-4" />
				</button>
				<button
					onclick={() => scrollKanban('right')}
					class="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-purple-700 dark:hover:text-white hover:border-purple-300 dark:hover:border-purple-500/40 shadow-xs transition-colors"
					title="Scroll Kanban Right"
				>
					<ChevronRight class="w-4 h-4" />
				</button>
			</div>
		</div>

		<div bind:this={kanbanContainerRef} class="flex items-start gap-4 overflow-x-auto pb-6 snap-x kanban-horizontal-scroll">
			{#each kanbanColumns as col}
				{@const colLeads = filteredLeads.filter((l) => l.status === col.id)}
				<div
					role="region"
					aria-label="{col.title} column"
					ondragover={(e) => handleDragOver(e, col.id)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, col.id)}
					class="w-72 flex-shrink-0 flex flex-col max-h-[calc(100vh-220px)] rounded-2xl border transition-all duration-200 {col.bg} {col.border} {dragOverColumn === col.id ? 'ring-2 ring-purple-500 scale-[1.01] bg-purple-100/50 dark:bg-purple-900/30' : ''}"
				>
					<!-- Column Header -->
					<div class="p-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between {col.headerBg} rounded-t-2xl">
						<div class="flex items-center gap-2">
							<span class="font-bold text-xs uppercase tracking-wider">{col.title}</span>
						</div>
						<span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold {col.badge} border border-current shadow-xs">
							{colLeads.length}
						</span>
					</div>

					<!-- Column Body Cards Container -->
					<div class="p-3 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-thin">
						{#each colLeads as lead (lead.id)}
							<div
								role="button"
								tabindex="0"
								draggable="true"
								ondragstart={(e) => handleDragStart(e, lead.id)}
								class="p-4 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-purple-400 dark:hover:border-purple-500/50 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all space-y-3 group"
							>
								<!-- Top Card Bar -->
								<div class="flex items-start justify-between gap-2">
									<div class="flex items-center gap-1.5 flex-1 min-w-0">
										<GripVertical class="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 flex-shrink-0" />
										<button
											onclick={() => {
												selectedLead = lead;
												isDetailOpen = true;
											}}
											class="font-bold text-xs text-slate-900 dark:text-slate-100 hover:text-purple-700 dark:hover:text-purple-300 text-left truncate"
										>
											{lead.businessName}
										</button>
									</div>

									<div class="flex items-center gap-1">
										<button
											onclick={() => promptDeleteLead(lead.id)}
											class="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 cursor-pointer"
											title="Delete Lead"
										>
											<Trash2 class="w-3 h-3" />
										</button>
									</div>
								</div>

								<!-- Contact Details -->
								<div class="space-y-1 text-[11px]">
									<div class="text-slate-700 dark:text-slate-300 truncate flex items-center gap-1.5 font-mono font-medium">
										<Mail class="w-3 h-3 text-purple-600 dark:text-purple-400 flex-shrink-0" />
										<span class="truncate">{lead.email}</span>
									</div>
									<div class="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
										<Phone class="w-3 h-3 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
										<span>{lead.phone}</span>
									</div>
								</div>

								<!-- Notes snippet if any -->
								{#if lead.notes}
									<p class="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/50 italic">
										"{lead.notes}"
									</p>
								{/if}

								<!-- Card Actions Footer -->
								<div class="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
									<button
										onclick={() => {
											selectedLead = lead;
											isDetailOpen = true;
										}}
										class="text-[10px] text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1 bg-purple-50 dark:bg-purple-500/10 px-2 py-1 rounded-md border border-purple-200 dark:border-purple-500/20 hover:bg-purple-100 transition-colors"
									>
										<FileText class="w-3 h-3 text-purple-600 dark:text-purple-400" /> Details & Email
									</button>

									<!-- Quick Stage Shifter -->
									<div class="flex items-center gap-1">
										{#if getPrevStage(lead.status)}
											<button
												onclick={() => updateLeadStatus(lead.id, getPrevStage(lead.status)!)}
												class="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
												title="Move to previous stage"
											>
												<ChevronLeft class="w-3 h-3" />
											</button>
										{/if}

										{#if getNextStage(lead.status)}
											<button
												onclick={() => updateLeadStatus(lead.id, getNextStage(lead.status)!)}
												class="p-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-600/30 dark:hover:bg-purple-600/50 dark:text-purple-200 border border-purple-300 dark:border-purple-500/30"
												title="Advance to next stage"
											>
												<ChevronRight class="w-3 h-3" />
											</button>
										{/if}
									</div>
								</div>
							</div>
						{:else}
							<div class="p-6 text-center text-slate-400 dark:text-slate-500 text-xs rounded-xl border border-dashed border-slate-300 dark:border-slate-800/80 my-auto bg-white/50 dark:bg-transparent">
								<p class="font-bold">No leads in stage</p>
								<p class="text-[10px] text-slate-500 mt-1">Drag lead card here</p>
							</div>
						{/each}
					</div>

					<!-- Column Footer Actions -->
					<div class="p-2 border-t border-slate-200 dark:border-slate-800/40 mt-auto">
						{#if col.id === 'NEW'}
							<button
								onclick={() => {
									newStatus = 'NEW';
									isAddModalOpen = true;
								}}
								class="w-full py-1.5 px-2 rounded-xl text-[11px] font-bold text-blue-800 dark:text-blue-300 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
							>
								<Plus class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Add New Lead
							</button>
						{:else}
							<button
								onclick={() => {
									moveTargetStage = col.id;
									moveSearchQuery = '';
									isMoveSearchOpen = true;
								}}
								class="w-full py-1.5 px-2 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-purple-900 dark:hover:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-950/30 border border-transparent hover:border-purple-200 dark:hover:border-purple-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
							>
								<Search class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Move Lead Here
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- MASTER LEADS DATA TABLE VIEW -->
		<div class="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden relative">
			<!-- Top Progress Shimmer Bar -->
			{#if isLoading}
				<div class="w-full bg-slate-200/50 dark:bg-slate-800/50 h-1 overflow-hidden relative z-20">
					<div class="bg-gradient-to-r from-purple-600 via-cyan-400 to-purple-600 h-full w-full animate-pulse"></div>
				</div>
			{/if}

			<!-- Table Content Overlay when Loading existing data -->
			{#if isLoading && filteredLeads.length > 0}
				<div class="absolute inset-0 bg-white/50 dark:bg-slate-950/50 backdrop-blur-[1.5px] z-10 flex items-center justify-center transition-all">
					<div class="px-4 py-2.5 rounded-full bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xl border border-purple-500/30 flex items-center gap-2.5 text-xs font-bold shadow-purple-500/10">
						<Loader2 class="w-4 h-4 animate-spin text-purple-400 dark:text-purple-600" />
						<span>{isSearchFiltering ? 'Filtering leads...' : 'Refreshing lead table...'}</span>
					</div>
				</div>
			{/if}

			<div class="overflow-x-auto">
				<table class="w-full text-left text-xs">
					<thead class="bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
						<tr>
							<th class="py-3.5 px-4">Business Name</th>
							<th class="py-3.5 px-4">Email Address</th>
							<th class="py-3.5 px-4">Phone Number</th>
							<th class="py-3.5 px-4">Lead Journey Stage</th>
							<th class="py-3.5 px-4 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-transparent">
						{#if isLoading && filteredLeads.length === 0}
							<!-- Skeleton Loading Rows -->
							{#each Array(5) as _, i}
								<tr class="animate-pulse">
									<td class="py-3.5 px-4"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4"></div></td>
									<td class="py-3.5 px-4"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-4/5"></div></td>
									<td class="py-3.5 px-4"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2"></div></td>
									<td class="py-3.5 px-4"><div class="h-6 bg-slate-200 dark:bg-slate-800 rounded-xl w-28"></div></td>
									<td class="py-3.5 px-4 text-right"><div class="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-16 ml-auto"></div></td>
								</tr>
							{/each}
						{:else}
							{#each filteredLeads as lead (lead.id)}
							<tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group">
								<td class="py-3.5 px-4">
									<button
										onclick={() => {
											selectedLead = lead;
											isDetailOpen = true;
										}}
										class="font-black text-sm text-slate-950 dark:text-slate-100 hover:text-purple-700 dark:hover:text-purple-400 text-left flex items-center gap-2"
									>
										<Building class="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
										<span>{lead.businessName}</span>
									</button>
								</td>

								<td class="py-3.5 px-4 font-mono">
									<div class="flex items-center justify-between gap-2 group/cell">
										<button
											onclick={() => copyToClipboard(lead.email)}
											title="Click to copy email address"
											class="flex items-center gap-1.5 font-bold text-xs text-slate-950 dark:text-slate-100 hover:text-purple-700 dark:hover:text-purple-300 text-left cursor-pointer transition-colors"
										>
											<Mail class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
											<span class="truncate max-w-[180px] sm:max-w-xs">{lead.email}</span>
										</button>

										{#if lead.email && lead.email !== 'No email address'}
											<button
												onclick={() => copyToClipboard(lead.email)}
												title="Copy email to clipboard"
												class="opacity-0 group-hover/cell:opacity-100 focus:opacity-100 p-1 rounded-md hover:bg-purple-100 dark:hover:bg-purple-950/80 text-slate-600 dark:text-slate-400 hover:text-purple-900 dark:hover:text-purple-300 transition-all cursor-pointer"
											>
												{#if copiedText === lead.email}
													<Check class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
												{:else}
													<Copy class="w-3.5 h-3.5" />
												{/if}
											</button>
										{/if}
									</div>
								</td>

								<td class="py-3.5 px-4 font-mono">
									<div class="flex items-center justify-between gap-2 group/cell">
										<button
											onclick={() => copyToClipboard(lead.phone)}
											title="Click to copy phone number"
											class="flex items-center gap-1.5 font-bold text-xs text-slate-950 dark:text-slate-100 hover:text-cyan-700 dark:hover:text-cyan-300 text-left cursor-pointer transition-colors"
										>
											<Phone class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
											<span>{lead.phone}</span>
										</button>

										{#if lead.phone && lead.phone !== 'N/A'}
											<button
												onclick={() => copyToClipboard(lead.phone)}
												title="Copy phone number to clipboard"
												class="opacity-0 group-hover/cell:opacity-100 focus:opacity-100 p-1 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-950/80 text-slate-600 dark:text-slate-400 hover:text-cyan-900 dark:hover:text-cyan-300 transition-all cursor-pointer"
											>
												{#if copiedText === lead.phone}
													<Check class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
												{:else}
													<Copy class="w-3.5 h-3.5" />
												{/if}
											</button>
										{/if}
									</div>
								</td>

								<td class="py-3.5 px-4">
									<select
										value={lead.status}
										onchange={(e) => updateLeadStatus(lead.id, (e.target as HTMLSelectElement).value)}
										class="border text-xs font-black rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer shadow-xs transition-all {getStatusClass(lead.status)}"
									>
										<option value="NEW" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">1. NEW</option>
										<option value="EMAILED" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">2. EMAILED</option>
										<option value="CONTACTED" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">3. CONTACTED</option>
										<option value="CONTRACT_SENT" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">4. CONTRACT SENT</option>
										<option value="CONTRACT_SIGNED" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">5. CONTRACT SIGNED</option>
										<option value="LOST" class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200">LOST</option>
									</select>
								</td>

								<td class="py-3.5 px-4 text-right">
									<div class="flex items-center justify-end gap-2">
										<button
											onclick={() => {
												selectedLead = lead;
												isDetailOpen = true;
											}}
											class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold"
											title="View Lead Profile & Email Sender"
										>
											<ChevronRight class="w-3.5 h-3.5" />
										</button>

										<button
											onclick={() => promptDeleteLead(lead.id)}
											class="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 cursor-pointer"
											title="Delete Lead"
										>
											<Trash2 class="w-3.5 h-3.5" />
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="5" class="py-12 text-center text-slate-500 text-sm">
									No leads found matching query. Try clearing filters or uploading a new CSV/Excel file.
								</td>
							</tr>
						{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- Modal Components -->
<LeadImporterModal bind:isOpen={isImporterOpen} />

<LeadDetailModal bind:isOpen={isDetailOpen} lead={selectedLead} />

<!-- Add Single Lead Modal (for NEW list) -->
{#if isAddModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
		<div class="glass-panel w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-2xl">
			<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">Add New Lead</h3>
			<form method="POST" action="?/createLead" class="space-y-3">
				<div>
					<label for="lead-business-name" class="block text-xs text-slate-700 dark:text-slate-300 font-bold mb-1">Business Name *</label>
					<input
						id="lead-business-name"
						type="text"
						name="businessName"
						required
						placeholder="e.g. Apex Hardware Store"
						class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs"
					/>
				</div>

				<div>
					<label for="lead-email" class="block text-xs text-slate-700 dark:text-slate-300 font-bold mb-1">Email Address *</label>
					<input
						id="lead-email"
						type="email"
						name="email"
						required
						placeholder="e.g. owner@apexhardware.com"
						class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs"
					/>
				</div>

				<div>
					<label for="lead-phone" class="block text-xs text-slate-700 dark:text-slate-300 font-bold mb-1">Phone Number *</label>
					<input
						id="lead-phone"
						type="text"
						name="phone"
						required
						placeholder="e.g. +1 (555) 123-4567"
						class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs"
					/>
				</div>

				<div>
					<label for="lead-status" class="block text-xs text-slate-700 dark:text-slate-300 font-bold mb-1">Initial Status</label>
					<select id="lead-status" name="status" bind:value={newStatus} class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs font-semibold">
						<option value="NEW">1. NEW</option>
						<option value="EMAILED">2. EMAILED</option>
						<option value="CONTACTED">3. CONTACTED</option>
					</select>
				</div>

				<div class="flex justify-end gap-3 pt-3">
					<button type="button" onclick={() => (isAddModalOpen = false)} class="btn-secondary text-xs">
						Cancel
					</button>
					<button type="submit" class="btn-primary text-xs">Save Lead</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Search & Move Lead Modal (for non-NEW Kanban Columns) -->
{#if isMoveSearchOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
		<div class="glass-panel w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-2xl relative">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<div>
					<span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
						Pipeline Stage Manager
					</span>
					<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display mt-1">
						Move Lead to: <span class="text-purple-700 dark:text-purple-300">{getTargetStageLabel(moveTargetStage)}</span>
					</h3>
				</div>
				<button onclick={() => (isMoveSearchOpen = false)} class="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white">
					<X class="w-5 h-5" />
				</button>
			</div>

			<p class="text-xs text-slate-600 dark:text-slate-400">
				Search through existing leads in your directory to advance or transfer a lead to <strong class="text-slate-900 dark:text-slate-200">{getTargetStageLabel(moveTargetStage)}</strong>.
			</p>

			<!-- Search Bar -->
			<div class="relative">
				<Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
				<input
					type="text"
					placeholder="Search business name, email, or phone..."
					bind:value={moveSearchQuery}
					class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-600 shadow-xs"
				/>
			</div>

			<!-- Search Results List -->
			<div class="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
				{#each moveSearchFiltered as lead}
					<div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/40 flex items-center justify-between gap-3 transition-all shadow-xs">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{lead.businessName}</span>
								<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase {getStatusClass(lead.status)}">
									{lead.status}
								</span>
							</div>
							<div class="text-[11px] text-slate-600 dark:text-slate-400 font-mono truncate mt-0.5 font-medium">
								{lead.email} • {lead.phone}
							</div>
						</div>

						<button
							onclick={() => moveLeadToStage(lead.id)}
							class="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 flex-shrink-0 cursor-pointer shadow-xs"
						>
							<span>Move Here</span>
							<ArrowRight class="w-3.5 h-3.5" />
						</button>
					</div>
				{:else}
					<div class="p-8 text-center text-slate-500 text-xs rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40">
						No eligible leads found matching search.
					</div>
				{/each}
			</div>

			<div class="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
				<button onclick={() => (isMoveSearchOpen = false)} class="btn-secondary text-xs cursor-pointer">
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<ConfirmModal
	bind:isOpen={isDeleteConfirmOpen}
	title="Delete Merchant Lead?"
	message="Are you sure you want to permanently delete this lead? All journey logs and notes will be removed."
	confirmText="Delete Lead"
	variant="danger"
	onConfirm={confirmDeleteLead}
/>
