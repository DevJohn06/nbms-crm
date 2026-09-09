<script lang="ts">
	import { Calendar, PhoneCall, Clock, CheckCircle2, XCircle, Search, Plus, User, Building, Mail, Phone, ExternalLink, RefreshCw, Loader2, X } from 'lucide-svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toastStore } from '$lib/toast.svelte';
	import { enhance } from '$app/forms';
	import { page, navigating } from '$app/stores';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let searchQuery = $state('');
	let debouncedSearchQuery = $state('');
	let searchByField = $state<'all' | 'client' | 'email' | 'business'>('all');
	let statusFilter = $state('ALL');
	let isBookModalOpen = $state(false);

	let isRefreshing = $state(false);
	let isSearchFiltering = $state(false);
	let isNavigating = $derived(!!$navigating);
	let isLoading = $derived(isRefreshing || isNavigating || isSearchFiltering);

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
			case 'client':
				return 'Search by Merchant Name...';
			case 'email':
				return 'Search by Email Address...';
			case 'business':
				return 'Search by Business Name...';
			default:
				return 'Search Merchant Name, Email, or Business...';
		}
	});

	async function refreshData() {
		isRefreshing = true;
		try {
			await invalidateAll();
		} finally {
			setTimeout(() => (isRefreshing = false), 350);
		}
	}

	let isDeleteCallConfirmOpen = $state(false);
	let callToDeleteId = $state<number | null>(null);

	function promptDeleteCall(id: number) {
		callToDeleteId = id;
		isDeleteCallConfirmOpen = true;
	}

	async function confirmDeleteCall() {
		if (!callToDeleteId) return;
		const id = callToDeleteId;
		callToDeleteId = null;

		isRefreshing = true;
		const form = new FormData();
		form.append('id', String(id));
		try {
			await fetch('?/deleteCall', { method: 'POST', body: form });
			await invalidateAll();
			toastStore.success('Call Log Deleted', 'The booked call record was removed.');
		} catch (err) {
			console.error(err);
			toastStore.error('Delete Failed', 'Could not delete strategy call log.');
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
				toastStore.success('Call Status Updated', 'Updated strategy call status.');
			}
		};
	}

	let filteredCalls = $derived.by(() => {
		return data.callsList.filter((call) => {
			const matchesStatus = statusFilter === 'ALL' || call.status === statusFilter;
			const q = debouncedSearchQuery.toLowerCase().trim();
			if (!q) return matchesStatus;

			let matchesQuery = false;
			if (searchByField === 'client') {
				matchesQuery = call.clientName.toLowerCase().includes(q);
			} else if (searchByField === 'email') {
				matchesQuery = call.clientEmail.toLowerCase().includes(q);
			} else if (searchByField === 'business') {
				matchesQuery = !!call.businessName && call.businessName.toLowerCase().includes(q);
			} else {
				matchesQuery =
					call.clientName.toLowerCase().includes(q) ||
					call.clientEmail.toLowerCase().includes(q) ||
					!!(call.businessName && call.businessName.toLowerCase().includes(q));
			}

			return matchesStatus && matchesQuery;
		});
	});

	function getStatusClass(status: string) {
		switch (status) {
			case 'SCHEDULED':
				return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40 font-bold';
			case 'COMPLETED':
				return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 font-bold';
			case 'CANCELLED':
				return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 font-bold';
			default:
				return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
		}
	}
</script>

<svelte:head>
	<title>Booked Merchant Calls & Calendar | Payjeezy CRM</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Banner -->
	<div class="glass-panel p-6 rounded-2xl border border-cyan-200 dark:border-cyan-500/30 bg-gradient-to-r from-white via-cyan-50 to-slate-50 dark:from-slate-900 dark:via-cyan-950/30 dark:to-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
		<div>
			<span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30">
				Calendly & Call Management
			</span>
			<h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2 mt-1">
				<PhoneCall class="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
				Booked Merchant Strategy Calls
			</h2>
			<p class="text-slate-600 dark:text-slate-400 text-xs mt-1">
				Track, schedule, and launch merchant consultation calls booked via Calendly or Landing Page CTAs.
			</p>
		</div>

		<button onclick={() => (isBookModalOpen = true)} class="btn-primary text-xs flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 border-none shadow-md">
			<Plus class="w-4 h-4" />
			Log Booked Call
		</button>
	</div>

	<!-- Controls & Filters Bar -->
	<div class="glass-panel p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
		<div class="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
			<div class="flex items-center gap-2 w-full md:w-auto flex-1 md:max-w-md">
				<div class="relative w-full">
					<Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
					<input
						type="text"
						placeholder={searchFieldPlaceholder}
						value={searchQuery}
						oninput={handleSearchInput}
						class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-cyan-500 focus:outline-none shadow-xs"
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
					class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none shadow-xs font-semibold cursor-pointer whitespace-nowrap"
					title="Filter search field"
				>
					<option value="all">Search By: All Fields</option>
					<option value="client">Search By: Merchant Name</option>
					<option value="email">Search By: Email</option>
					<option value="business">Search By: Business</option>
				</select>
			</div>

			<select
				bind:value={statusFilter}
				class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none shadow-xs"
			>
				<option value="ALL">All Call Statuses</option>
				<option value="SCHEDULED">Scheduled Only</option>
				<option value="COMPLETED">Completed</option>
				<option value="CANCELLED">Cancelled</option>
			</select>

			<button
				type="button"
				onclick={refreshData}
				disabled={isLoading}
				class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs disabled:opacity-50"
				title="Refresh strategy call table data"
			>
				<RefreshCw class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 {isLoading ? 'animate-spin' : ''}" />
				<span class="hidden sm:inline">Refresh</span>
			</button>
		</div>

		<div class="flex items-center gap-3">
			{#if isLoading}
				<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50 animate-pulse">
					<Loader2 class="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
					<span>{isSearchFiltering ? 'Filtering...' : 'Loading...'}</span>
				</span>
			{/if}

			<div class="text-xs text-slate-500 dark:text-slate-400 font-medium">
				Showing <span class="text-cyan-700 dark:text-cyan-300 font-bold">{filteredCalls.length}</span> of {data.callsList.length} total calls
			</div>
		</div>
	</div>

	<!-- Booked Calls Directory Table -->
	<div class="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden relative">
		<!-- Top Progress Shimmer Bar -->
		{#if isLoading}
			<div class="w-full bg-slate-200/50 dark:bg-slate-800/50 h-1 overflow-hidden relative z-20">
				<div class="bg-gradient-to-r from-cyan-600 via-purple-500 to-cyan-600 h-full w-full animate-pulse"></div>
			</div>
		{/if}

		<!-- Table Overlay when loading existing records -->
		{#if isLoading && filteredCalls.length > 0}
			<div class="absolute inset-0 bg-white/50 dark:bg-slate-950/50 backdrop-blur-[1.5px] z-10 flex items-center justify-center transition-all">
				<div class="px-4 py-2.5 rounded-full bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xl border border-cyan-500/30 flex items-center gap-2.5 text-xs font-bold shadow-cyan-500/10">
					<Loader2 class="w-4 h-4 animate-spin text-cyan-400 dark:text-cyan-600" />
					<span>{isSearchFiltering ? 'Filtering calls directory...' : 'Refreshing calls directory...'}</span>
				</div>
			</div>
		{/if}

		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs">
				<thead class="bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
					<tr>
						<th class="py-3.5 px-4">Merchant / Client</th>
						<th class="py-3.5 px-4">Contact Info</th>
						<th class="py-3.5 px-4">Call Schedule & Time</th>
						<th class="py-3.5 px-4">Meeting Type</th>
						<th class="py-3.5 px-4">Status</th>
						<th class="py-3.5 px-4 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-transparent">
					{#if isLoading && filteredCalls.length === 0}
						{#each Array(5) as _, i}
							<tr class="animate-pulse">
								<td class="py-3.5 px-4"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4"></div></td>
								<td class="py-3.5 px-4"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-4/5"></div></td>
								<td class="py-3.5 px-4"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2"></div></td>
								<td class="py-3.5 px-4"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-24"></div></td>
								<td class="py-3.5 px-4"><div class="h-6 bg-slate-200 dark:bg-slate-800 rounded-xl w-20"></div></td>
								<td class="py-3.5 px-4 text-right"><div class="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-16 ml-auto"></div></td>
							</tr>
						{/each}
					{:else}
						{#each filteredCalls as call}
						<tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
							<td class="py-3.5 px-4">
								<div class="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
									<User class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
									{call.clientName}
								</div>
								{#if call.businessName}
									<div class="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
										<Building class="w-3 h-3 text-slate-400" />
										{call.businessName}
									</div>
								{/if}
							</td>

							<td class="py-3.5 px-4">
								<div class="text-slate-800 dark:text-slate-300 font-medium flex items-center gap-1.5">
									<Mail class="w-3 h-3 text-slate-400" />
									{call.clientEmail}
								</div>
								{#if call.clientPhone}
									<div class="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
										<Phone class="w-3 h-3 text-slate-400" />
										{call.clientPhone}
									</div>
								{/if}
							</td>

							<td class="py-3.5 px-4">
								<div class="font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
									<Calendar class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
									{new Date(call.callDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
								</div>
								<div class="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
									<Clock class="w-3 h-3 text-slate-400" />
									{new Date(call.callDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
								</div>
							</td>

							<td class="py-3.5 px-4">
								<span class="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
									{call.meetingType}
								</span>
							</td>

							<td class="py-3.5 px-4">
								<span class="badge-rocket border {getStatusClass(call.status)}">
									{call.status}
								</span>
							</td>

							<td class="py-3.5 px-4 text-right">
								<div class="flex items-center justify-end gap-1.5">
									{#if call.status === 'SCHEDULED'}
										<form method="POST" action="?/updateCallStatus" use:enhance={handleFormEnhance}>
											<input type="hidden" name="id" value={call.id} />
											<input type="hidden" name="status" value="COMPLETED" />
											<button type="submit" class="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 font-bold flex items-center gap-1 text-[11px]" title="Mark Completed">
												<CheckCircle2 class="w-3.5 h-3.5" />
												Complete
											</button>
										</form>
									{/if}

									<button
										type="button"
										onclick={() => promptDeleteCall(call.id)}
										class="p-1.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/20 cursor-pointer"
										title="Delete Call"
									>
										<XCircle class="w-3.5 h-3.5" />
									</button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="py-12 text-center text-slate-500 text-sm">
								No strategy calls booked yet. Click "Log Booked Call" to manually schedule a meeting.
							</td>
						</tr>
					{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

{#if isBookModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
		<div class="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
					<PhoneCall class="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
					Schedule Merchant Strategy Session
				</h3>
				<button onclick={() => (isBookModalOpen = false)} class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
					<XCircle class="w-5 h-5" />
				</button>
			</div>

			<form method="POST" action="?/bookCall" use:enhance={() => {
				return async ({ update }) => {
					isBookModalOpen = false;
					update();
				};
			}} class="space-y-4">
				<div class="space-y-1.5">
					<label for="clientName" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Client Name *</label>
					<input id="clientName" name="clientName" required placeholder="Alex Mercer" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-none" />
				</div>

				<div class="space-y-1">
					<label for="clientEmail" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Client Email *</label>
					<input id="clientEmail" name="clientEmail" type="email" required placeholder="alex@example.com" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-none" />
				</div>
				<div class="space-y-1.5">
					<label for="clientPhone" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Phone</label>
					<input id="clientPhone" name="clientPhone" placeholder="+1 555-0199" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-none" />
				</div>

				<div class="space-y-1.5">
					<label for="businessName" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Business Name</label>
					<input id="businessName" name="businessName" placeholder="Apex Retail Solutions" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-none" />
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-1.5">
						<label for="callDate" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Call Date & Time *</label>
						<input id="callDate" name="callDate" type="datetime-local" required class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-none" />
					</div>

					<div class="space-y-1.5">
						<label for="meetingType" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Meeting Type</label>
						<select id="meetingType" name="meetingType" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-none">
							<option value="Merchant Strategy Session">Merchant Strategy Session</option>
							<option value="POS Integration Setup">POS Integration Setup</option>
							<option value="Rates & Underwriting Review">Rates & Underwriting Review</option>
						</select>
					</div>
				</div>

				<div class="space-y-1.5">
					<label for="notes" class="block text-xs font-semibold text-slate-700 dark:text-slate-300">Call Agenda / Notes</label>
					<textarea id="notes" name="notes" rows="2" placeholder="Discussion topics, processing volume, hardware requests..." class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-none"></textarea>
				</div>

				<div class="flex items-center justify-end gap-3 pt-2">
					<button type="button" onclick={() => (isBookModalOpen = false)} class="btn-secondary text-xs cursor-pointer">Cancel</button>
					<button type="submit" class="btn-primary text-xs bg-cyan-600 hover:bg-cyan-700 cursor-pointer">Save Booked Call</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<ConfirmModal
	bind:isOpen={isDeleteCallConfirmOpen}
	title="Delete Strategy Call Log?"
	message="Are you sure you want to delete this strategy call record?"
	confirmText="Delete Call"
	variant="danger"
	onConfirm={confirmDeleteCall}
/>
