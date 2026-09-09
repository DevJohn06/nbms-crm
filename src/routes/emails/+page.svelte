<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import { Mail, Send, CheckCircle2, Clock, Search, Layers, User, Plus, ExternalLink, X, ChevronDown } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let selectedLeadId = $state('');
	let selectedTemplateId = $state('');
	let customSubject = $state('');
	let customBody = $state('');
	let isSending = $state(false);
	let sendNotice = $state('');

	let activeLog = $state<any>(null);

	// Searchable lead combobox state
	let leadSearchQuery = $state('');
	let isLeadDropdownOpen = $state(false);

	let filteredLeads = $derived.by(() => {
		if (!data?.leads) return [];
		const q = leadSearchQuery.toLowerCase().trim();
		if (!q) return data.leads;
		return data.leads.filter(
			(l: any) =>
				l.businessName?.toLowerCase().includes(q) ||
				l.email?.toLowerCase().includes(q) ||
				l.phone?.includes(q)
		);
	});

	$effect(() => {
		if (data?.logs?.length && !activeLog) {
			activeLog = data.logs[0];
		}

		// Auto select lead from URL query param e.g. /emails?leadId=5
		const urlLeadId = $page.url.searchParams.get('leadId');
		if (urlLeadId && !selectedLeadId && data?.leads?.length) {
			const found = data.leads.find((l: any) => String(l.id) === String(urlLeadId));
			if (found) {
				selectedLeadId = String(found.id);
				leadSearchQuery = `${found.businessName} (${found.email})`;
			}
		}
	});

	function selectLead(lead: any) {
		selectedLeadId = String(lead.id);
		leadSearchQuery = `${lead.businessName} (${lead.email})`;
		isLeadDropdownOpen = false;
		applyTemplate();
	}

	function clearLeadSelection() {
		selectedLeadId = '';
		leadSearchQuery = '';
		isLeadDropdownOpen = false;
	}

	function applyTemplate() {
		const tmpl = data.templates.find((t) => t.id === Number(selectedTemplateId));
		const lead = data.leads.find((l) => l.id === Number(selectedLeadId));
		if (tmpl && lead) {
			customSubject = tmpl.subject;
			customBody = tmpl.bodyHtml
				.replace(/\{\{\s*businessName\s*\}\}/g, lead.businessName)
				.replace(/\{\{\s*email\s*\}\}/g, lead.email)
				.replace(/\{\{\s*phone\s*\}\}/g, lead.phone)
				.replace(/\{\{\s*funnelLink\s*\}\}/g, `${window.location.origin}/funnel/${lead.id}`);
		}
	}

	async function handleSend() {
		if (!selectedLeadId || !customSubject || !customBody) {
			sendNotice = 'Select a lead, subject, and content before sending.';
			return;
		}

		isSending = true;
		sendNotice = '';

		try {
			const res = await fetch('/api/emails/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					leadId: Number(selectedLeadId),
					templateId: selectedTemplateId ? Number(selectedTemplateId) : null,
					subject: customSubject,
					bodyHtml: customBody
				})
			});

			if (res.ok) {
				sendNotice = 'Email dispatched successfully!';
				customSubject = '';
				customBody = '';
				setTimeout(() => window.location.reload(), 1500);
			} else {
				sendNotice = 'Failed to dispatch email.';
			}
		} catch (err: any) {
			sendNotice = err?.message || 'Error dispatching email';
		} finally {
			isSending = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
				<Mail class="w-6 h-6 text-purple-600 dark:text-purple-400" />
				Email Communications & Inbox Log
			</h2>
			<p class="text-slate-600 dark:text-slate-400 text-xs mt-1">
				Monitor all automated drip scripts and manual emails sent to merchant leads.
			</p>
		</div>

		<a href="/emails/templates" class="btn-secondary text-xs flex items-center gap-2 shadow-xs">
			<Layers class="w-4 h-4 text-purple-600 dark:text-purple-400" />
			Manage Script Templates
		</a>
	</div>

	<!-- Main Inbox Layout Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Left: Outgoing Email Dispatcher Form -->
		<div class="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
			<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
				<Send class="w-4 h-4 text-purple-600 dark:text-purple-400" />
				Compose / Trigger Script Email
			</h3>

			<div class="space-y-3">
				<!-- Searchable Merchant Lead Combobox -->
				<div>
					<label for="lead-search-input" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Merchant Lead *</label>
					<div class="relative">
						<div class="relative flex items-center">
							<Search class="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
							<input
								id="lead-search-input"
								type="text"
								placeholder="Search business name or email..."
								bind:value={leadSearchQuery}
								onfocus={() => (isLeadDropdownOpen = true)}
								oninput={() => (isLeadDropdownOpen = true)}
								class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-8 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600 shadow-xs font-medium"
							/>
							{#if leadSearchQuery || selectedLeadId}
								<button
									type="button"
									onclick={clearLeadSelection}
									class="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
									title="Clear search and selection"
								>
									<X class="w-3.5 h-3.5" />
								</button>
							{/if}
						</div>

						<!-- Autocomplete Results Dropdown Panel -->
						{#if isLeadDropdownOpen}
							<!-- Click outside backdrop listener -->
							<button
								type="button"
								tabindex="-1"
								aria-label="Close dropdown backdrop"
								onclick={() => (isLeadDropdownOpen = false)}
								class="fixed inset-0 z-10 cursor-default bg-transparent"
							></button>

							<div class="absolute left-0 right-0 top-full mt-1.5 z-20 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl space-y-1 p-1">
								{#each filteredLeads as lead}
									<button
										type="button"
										onclick={() => selectLead(lead)}
										class="w-full text-left p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer {String(selectedLeadId) === String(lead.id) ? 'bg-purple-100/70 dark:bg-purple-900/40 font-bold border border-purple-200 dark:border-purple-500/30' : ''}"
									>
										<div class="truncate">
											<span class="font-bold text-slate-900 dark:text-slate-100 block truncate">{lead.businessName}</span>
											<span class="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{lead.email}</span>
										</div>
										{#if String(selectedLeadId) === String(lead.id)}
											<CheckCircle2 class="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
										{/if}
									</button>
								{:else}
									<div class="p-3 text-center text-slate-500 text-xs italic">
										No merchant leads match "{leadSearchQuery}"
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<div>
					<label for="script-template" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Script Template (Optional)</label>
					<select
						id="script-template"
						bind:value={selectedTemplateId}
						onchange={applyTemplate}
						class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs"
					>
						<option value="">-- Custom Script --</option>
						{#each data.templates as tmpl}
							<option value={tmpl.id}>{tmpl.name}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="email-subject" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject Line *</label>
					<input
						id="email-subject"
						type="text"
						placeholder={"e.g. Exclusive Payjeezy Rates for {{businessName}}"}
						bind:value={customSubject}
						class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-purple-600 shadow-xs"
					/>
				</div>

				<div>
					<label for="email-body" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Body (HTML Supported) *</label>
					<textarea
						id="email-body"
						rows="6"
						placeholder={"Write custom email content or insert {{funnelLink}}..."}
						bind:value={customBody}
						class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-purple-600 font-mono shadow-xs"
					></textarea>
				</div>

				{#if sendNotice}
					<div class="p-2.5 rounded-xl text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30">
						{sendNotice}
					</div>
				{/if}

				<button
					onclick={handleSend}
					disabled={isSending}
					class="btn-primary w-full text-xs flex items-center justify-center gap-2 py-2.5 shadow-sm"
				>
					<Send class="w-4 h-4" />
					{isSending ? 'Dispatching Email...' : 'Dispatch Email Now'}
				</button>
			</div>
		</div>

		<!-- Right: Email Communications Stream & Preview (2 cols) -->
		<div class="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-4">
			<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
				<Mail class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
				Communication Activity Stream ({data.logs.length})
			</h3>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 h-[500px]">
				<!-- List of Email Logs -->
				<div class="space-y-2 overflow-y-auto pr-1">
					{#each data.logs as log}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							onclick={() => (activeLog = log)}
							class="p-3.5 rounded-xl border text-xs cursor-pointer transition-all space-y-1.5 {activeLog?.id === log.id ? 'bg-purple-50 text-purple-900 border-purple-300 shadow-sm dark:bg-purple-950/40 dark:text-slate-100 dark:border-purple-500/40' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
						>
							<div class="flex items-center justify-between">
								<span class="font-bold text-slate-900 dark:text-slate-100 truncate">{log.businessName || log.recipient}</span>
								<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
									{log.status}
								</span>
							</div>

							<div class="text-slate-700 dark:text-slate-300 font-medium truncate">{log.subject}</div>

							<div class="flex items-center justify-between text-[10px] text-slate-500 pt-1">
								<span>To: {log.recipient}</span>
								<span>{new Date(log.sentAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
							</div>
						</div>
					{:else}
						<div class="p-8 text-center text-slate-500 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
							No emails logged yet.
						</div>
					{/each}
				</div>

				<!-- Active Log Reader View -->
				{#if activeLog}
					<div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-y-auto shadow-xs">
						<div class="space-y-3">
							<div class="border-b border-slate-200 dark:border-slate-800 pb-3">
								<div class="text-xs font-bold text-slate-900 dark:text-slate-200">{activeLog.subject}</div>
								<div class="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
									Recipient: <span class="text-purple-700 dark:text-purple-300 font-bold">{activeLog.recipient}</span>
								</div>
								<div class="text-[10px] text-slate-500">
									Sent: {new Date(activeLog.sentAt).toLocaleString()}
								</div>
							</div>

							<div class="text-xs text-slate-800 dark:text-slate-300 font-sans leading-relaxed bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 shadow-xs">
								{@html activeLog.bodyHtml}
							</div>
						</div>

						<div class="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
							<span>Sender: {activeLog.sender}</span>
							<span class="text-emerald-700 dark:text-emerald-400 font-bold">Status: {activeLog.status}</span>
						</div>
					</div>
				{:else}
					<div class="p-8 text-center text-slate-500 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
						Select an email log on the left to read full content.
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
