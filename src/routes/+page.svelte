<script lang="ts">
	import type { PageData } from './$types';
	import { page, navigating } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import {
		Users,
		Mail,
		FileCheck,
		TrendingUp,
		ArrowUpRight,
		Send,
		FileText,
		CheckCircle2,
		Sparkles,
		Clock,
		ExternalLink,
		RefreshCw,
		Loader2,
		AlertCircle,
		Layers
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

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

	let userName = $derived($page.data.user?.name || (data as any).user?.name || 'Merchant Ops');

	function getStatusBadgeClass(status: string) {
		switch (status) {
			case 'NEW':
				return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30';
			case 'EMAILED':
				return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30';
			case 'CONTACTED':
				return 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30';
			case 'FUNNEL_COMPLETED':
				return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30';
			case 'CONTRACT_SENT':
				return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30';
			case 'CONTRACT_SIGNED':
				return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30';
			case 'LOST':
				return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30';
			default:
				return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30';
		}
	}
</script>

<div class="space-y-6">
	<!-- Hero Header -->
	<div class="glass-panel p-6 rounded-2xl relative overflow-hidden border border-[#dbe7f1] dark:border-slate-800/80 bg-white/95 dark:bg-[#0a192f]/80 shadow-sm">
		<div class="absolute -right-12 -top-12 w-64 h-64 bg-[#1f71c1]/10 rounded-full blur-3xl pointer-events-none"></div>
		<div class="absolute -left-12 -bottom-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

		<div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<div class="flex items-center gap-2">
					<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 flex items-center gap-1.5">
						<Sparkles class="w-3.5 h-3.5 text-[#1f71c1] dark:text-[#6ec1e4]" />
						NBMS Intelligent CRM Engine
					</span>
				</div>
				<h2 class="text-2xl md:text-3xl font-extrabold tracking-tight mt-2 font-display text-slate-900 dark:text-white">
					Welcome back, {userName} 👋
				</h2>
				<p class="text-slate-600 dark:text-slate-400 text-sm mt-1">
					Manage your lead master list, trigger automated onboarding emails, and track contract signings in real time.
				</p>
			</div>

			<div class="flex items-center gap-3">
				<a href="/leads" class="btn-primary flex items-center gap-2 text-sm shadow-sm">
					<Users class="w-4 h-4" />
					View Master List
				</a>
				<a href="/funnel" class="btn-secondary flex items-center gap-2 text-sm shadow-xs">
					<ExternalLink class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
					Public Intake Funnel
				</a>
			</div>
		</div>
	</div>

	{#if data.noVerticalsAssigned}
		<!-- No Verticals Assigned Empty State -->
		<div class="glass-panel p-8 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20 shadow-sm text-center max-w-2xl mx-auto my-8 space-y-3">
			<div class="w-12 h-12 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 mx-auto flex items-center justify-center">
				<AlertCircle class="w-6 h-6" />
			</div>
			<h3 class="text-lg font-bold text-amber-950 dark:text-amber-200 font-display">No Business Verticals Assigned</h3>
			<p class="text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed">
				Your user account currently has no assigned business verticals. All lead records, pipeline metrics, and client communications are hidden until an administrator assigns you access to one or more verticals.
			</p>
			<div class="pt-2">
				{#if $page.data.user?.role === 'SUPER_ADMIN'}
					<a href="/users" class="btn-primary inline-flex items-center gap-2 text-xs py-2 px-4 shadow-sm">
						Manage Users & Assign Verticals
					</a>
				{:else}
					<span class="text-xs font-semibold text-slate-500">Please contact your administrator to assign a vertical to your account.</span>
				{/if}
			</div>
		</div>
	{:else}
		<!-- KPI Metric Cards Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
		<!-- Total Leads Card -->
		<div class="glass-panel p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs hover:border-purple-400/40 transition-all">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Leads</span>
				<div class="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 flex items-center justify-center font-bold">
					<Users class="w-4 h-4" />
				</div>
			</div>
			<div class="mt-3 flex items-baseline justify-between">
				<span class="text-3xl font-bold font-display text-slate-900 dark:text-white">{data.totalCount}</span>
				<span class="text-xs text-purple-700 dark:text-purple-400 font-semibold flex items-center gap-1">
					<ArrowUpRight class="w-3.5 h-3.5" />
					Active
				</span>
			</div>
			<p class="text-[11px] text-slate-500 mt-2">{data.newCount} newly imported leads</p>
		</div>

		<!-- Emailed / Contacted Card -->
		<div class="glass-panel p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs hover:border-indigo-400/40 transition-all">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Emailed / Contacted</span>
				<div class="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center font-bold">
					<Mail class="w-4 h-4" />
				</div>
			</div>
			<div class="mt-3 flex items-baseline justify-between">
				<span class="text-3xl font-bold font-display text-slate-900 dark:text-white">{data.emailedCount}</span>
				<span class="text-xs text-indigo-700 dark:text-indigo-400 font-semibold">In Sequence</span>
			</div>
			<p class="text-[11px] text-slate-500 mt-2">Custom scripts & automated triggers</p>
		</div>

		<!-- Funnel Submissions Card -->
		<div class="glass-panel p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs hover:border-cyan-400/40 transition-all">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Funnel Intakes</span>
				<div class="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 flex items-center justify-center font-bold">
					<Sparkles class="w-4 h-4" />
				</div>
			</div>
			<div class="mt-3 flex items-baseline justify-between">
				<span class="text-3xl font-bold font-display text-slate-900 dark:text-white">{data.contactedCount + data.contractSentCount}</span>
				<span class="text-xs text-cyan-700 dark:text-cyan-400 font-semibold">Forms Filled</span>
			</div>
			<p class="text-[11px] text-slate-500 mt-2">Landing page intake submissions</p>
		</div>

		<!-- Signed Contracts Card -->
		<div class="glass-panel p-5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs hover:border-emerald-400/40 transition-all">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Signed Contracts</span>
				<div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center font-bold">
					<FileCheck class="w-4 h-4" />
				</div>
			</div>
			<div class="mt-3 flex items-baseline justify-between">
				<span class="text-3xl font-bold font-display text-emerald-600 dark:text-emerald-300">{data.signedCount}</span>
				<span class="text-xs text-emerald-800 dark:text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20">
					{data.conversionRate}% Conv
				</span>
			</div>
			<p class="text-[11px] text-slate-500 mt-2">PDF generated & digitally signed</p>
		</div>
	</div>

	<!-- Lead Journey Pipeline Visualizer -->
	<div class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs">
		<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2 mb-4">
			<TrendingUp class="w-4 h-4 text-purple-600 dark:text-purple-400" />
			Lead Journey Conversion Pipeline
		</h3>

		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
			<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
				<div class="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">1. New Imports</div>
				<div class="text-xl font-bold text-slate-900 dark:text-slate-100 font-display mt-1">{data.newCount}</div>
				<div class="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
					<div class="bg-blue-500 h-full rounded-full" style="width: {data.totalCount ? (data.newCount / data.totalCount) * 100 : 0}%"></div>
				</div>
			</div>

			<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
				<div class="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">2. Emailed</div>
				<div class="text-xl font-bold text-slate-900 dark:text-slate-100 font-display mt-1">{data.emailedCount}</div>
				<div class="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
					<div class="bg-purple-500 h-full rounded-full" style="width: {data.totalCount ? (data.emailedCount / data.totalCount) * 100 : 0}%"></div>
				</div>
			</div>

			<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
				<div class="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">3. Contacted</div>
				<div class="text-xl font-bold text-slate-900 dark:text-slate-100 font-display mt-1">{data.contactedCount}</div>
				<div class="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
					<div class="bg-amber-500 h-full rounded-full" style="width: {data.totalCount ? (data.contactedCount / data.totalCount) * 100 : 0}%"></div>
				</div>
			</div>

			<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
				<div class="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">4. Contract Sent</div>
				<div class="text-xl font-bold text-slate-900 dark:text-slate-100 font-display mt-1">{data.contractSentCount}</div>
				<div class="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
					<div class="bg-indigo-500 h-full rounded-full" style="width: {data.totalCount ? (data.contractSentCount / data.totalCount) * 100 : 0}%"></div>
				</div>
			</div>

			<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
				<div class="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">5. Closed & Signed</div>
				<div class="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-display mt-1">{data.signedCount}</div>
				<div class="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
					<div class="bg-emerald-500 h-full rounded-full" style="width: {data.totalCount ? (data.signedCount / data.totalCount) * 100 : 0}%"></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Recent Master Leads & Recent Signed Contracts split view -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Master Lead Overview Table (2 cols) -->
		<div class="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
					<Users class="w-4 h-4 text-purple-600 dark:text-purple-400" />
					Recent Leads Directory
				</h3>
				<div class="flex items-center gap-3">
					<button
						type="button"
						onclick={refreshData}
						disabled={isLoading}
						class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs disabled:opacity-50"
						title="Refresh recent leads"
					>
						<RefreshCw class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 {isLoading ? 'animate-spin' : ''}" />
						<span>Refresh</span>
					</button>
					<a href="/leads" class="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold flex items-center gap-1">
						View All ({data.totalCount})
						<ArrowUpRight class="w-3.5 h-3.5" />
					</a>
				</div>
			</div>

			<div class="overflow-x-auto border border-slate-200 dark:border-slate-800/80 rounded-xl relative">
				<!-- Top Progress Shimmer Bar -->
				{#if isLoading}
					<div class="w-full bg-slate-200/50 dark:bg-slate-800/50 h-1 overflow-hidden relative z-20">
						<div class="bg-gradient-to-r from-purple-600 via-cyan-400 to-purple-600 h-full w-full animate-pulse"></div>
					</div>
				{/if}

				<!-- Table Overlay when loading existing records -->
				{#if isLoading && data.leads.length > 0}
					<div class="absolute inset-0 bg-white/50 dark:bg-slate-950/50 backdrop-blur-[1.5px] z-10 flex items-center justify-center transition-all">
						<div class="px-4 py-2 rounded-full bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xl border border-purple-500/30 flex items-center gap-2 text-xs font-bold shadow-purple-500/10">
							<Loader2 class="w-4 h-4 animate-spin text-purple-400 dark:text-purple-600" />
							<span>Refreshing...</span>
						</div>
					</div>
				{/if}
				<table class="w-full text-left text-xs">
					<thead class="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
						<tr>
							<th class="py-3 px-3">Business Name</th>
							<th class="py-3 px-3">Contact</th>
							<th class="py-3 px-3">Journey Status</th>
							<th class="py-3 px-3 text-right">Date</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-transparent">
						{#if isLoading && data.leads.length === 0}
							{#each Array(5) as _, i}
								<tr class="animate-pulse">
									<td class="py-3 px-3"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4"></div></td>
									<td class="py-3 px-3">
										<div class="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-4/5"></div>
										<div class="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2 mt-1"></div>
									</td>
									<td class="py-3 px-3"><div class="h-5 bg-slate-200 dark:bg-slate-800 rounded-xl w-24"></div></td>
									<td class="py-3 px-3 text-right"><div class="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16 ml-auto"></div></td>
								</tr>
							{/each}
						{:else}
							{#each data.leads as lead}
								<tr class="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
									<td class="py-3 px-3 font-bold text-slate-900 dark:text-slate-200">{lead.businessName}</td>
									<td class="py-3 px-3 text-slate-600 dark:text-slate-400">
										<div class="font-medium text-slate-800 dark:text-slate-300">{lead.email}</div>
										<div class="text-[10px] text-slate-500">{lead.phone}</div>
									</td>
									<td class="py-3 px-3">
										<span class="badge-rocket border {getStatusBadgeClass(lead.status)}">
											{lead.status.replace('_', ' ')}
										</span>
									</td>
									<td class="py-3 px-3 text-right text-slate-500 font-medium">
										{new Date(lead.createdAt).toLocaleDateString()}
									</td>
								</tr>
							{:else}
								<tr>
									<td colspan="4" class="py-8 text-center text-slate-500 text-sm">
										No leads found. Click "+ Import Leads" to upload your CSV/Excel list.
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Recent Signed Contracts & Activity Sidebar -->
		<div class="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
			<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
				<FileText class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
				Recent Contracts
			</h3>

			<div class="space-y-3">
				{#each data.recentContracts as contract}
					<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/30 transition-all flex items-center justify-between shadow-xs">
						<div>
							<div class="flex items-center gap-2">
								<span class="text-xs font-bold text-slate-900 dark:text-slate-200">{contract.clientName}</span>
								<span class="px-1.5 py-0.5 rounded text-[9px] font-bold {contract.status === 'SIGNED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30' : 'bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'}">
									{contract.status === 'PENDING_SIGNATURE' ? 'PENDING' : contract.status}
								</span>
							</div>
							<div class="text-[11px] text-purple-700 dark:text-purple-400 font-semibold">{contract.servicePackage}</div>
							<div class="text-[10px] text-slate-500 mt-1 font-medium">{contract.id} • {contract.monthlyFee}</div>
						</div>
						<a
							href="/api/contracts/{contract.id}/download"
							class="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors"
							title="Download Signed Contract PDF"
						>
							<FileCheck class="w-4 h-4" />
						</a>
					</div>
				{:else}
					<div class="p-6 text-center text-slate-500 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
						No signed contracts generated yet. Intakes from the funnel page will appear here.
					</div>
				{/each}
			</div>

			<div class="pt-2 border-t border-slate-200 dark:border-slate-800">
				<a href="/emails" class="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline flex items-center justify-between">
					<span>View All Email Communications</span>
					<ArrowUpRight class="w-3.5 h-3.5" />
				</a>
			</div>
		</div>
	</div>
	{/if}
</div>
