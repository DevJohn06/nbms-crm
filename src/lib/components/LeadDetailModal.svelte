<script lang="ts">
	import { X, Mail, Phone, Building, Calendar, FileText, Send, CheckCircle2, Clock, Plus, Edit3, Copy, Check, Maximize2, ChevronDown, ChevronUp, Inbox, ExternalLink, Trash2, MessageSquare } from 'lucide-svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toastStore } from '$lib/toast.svelte';

	let { lead, isOpen = $bindable(false), emailTemplates = [] }: { lead: any; isOpen: boolean; emailTemplates?: any[] } = $props();

	let copiedField = $state<string | null>(null);
	let expandedLogId = $state<number | null>(null);
	let modalViewLog = $state<any | null>(null);

	function copyToClipboard(text: string, label: string) {
		if (!text || typeof window === 'undefined') return;
		navigator.clipboard.writeText(text);
		copiedField = label;
		setTimeout(() => {
			if (copiedField === label) copiedField = null;
		}, 2000);
	}

	// Derived array of unique emails for active lead
	let allEmails = $derived.by(() => {
		if (!lead) return [];
		const set = new Set<string>();

		if (lead.email && lead.email !== 'no-email@provided.com') {
			lead.email.split(/[,;]+/).forEach((e: string) => {
				const trimmed = e.trim();
				if (trimmed && trimmed !== 'no-email@provided.com') set.add(trimmed);
			});
		}

		if (lead.notes) {
			const matches = lead.notes.matchAll(/Alt Email:\s*([^\n\]\r]+)/gi);
			for (const match of matches) {
				if (match[1]) {
					match[1].split(/[,;]+/).forEach((e: string) => {
						const trimmed = e.trim();
						if (trimmed && trimmed !== 'no-email@provided.com') set.add(trimmed);
					});
				}
			}
		}

		return Array.from(set);
	});

	// Derived array of unique phone numbers for active lead
	let allPhones = $derived.by(() => {
		if (!lead) return [];
		const set = new Set<string>();

		if (lead.phone && lead.phone !== 'N/A') {
			lead.phone.split(/[,;]+/).forEach((p: string) => {
				const trimmed = p.trim();
				if (trimmed && trimmed !== 'N/A') set.add(trimmed);
			});
		}

		if (lead.notes) {
			const matches = lead.notes.matchAll(/Alt Phone:\s*([^\n\]\r]+)/gi);
			for (const match of matches) {
				if (match[1]) {
					match[1].split(/[,;]+/).forEach((p: string) => {
						const trimmed = p.trim();
						if (trimmed && trimmed !== 'N/A') set.add(trimmed);
					});
				}
			}
		}

		return Array.from(set);
	});

	let emailLogs = $state<any[]>([]);
	let selectedTemplateId = $state('');
	let emailSubject = $state('');
	let emailBody = $state('');
	let isSending = $state(false);
	let sendFeedback = $state('');

	let contractInfo = $state<any>(null);
	let isGeneratingPdf = $state(false);
	let pdfFeedback = $state('');

	// In-drawer Contract Details Form State
	let clientNameInput = $state('');
	let clientEmailInput = $state('');
	let servicePackageInput = $state('Growth Pro Merchant Package');
	let monthlyFeeInput = $state('$199 / month');
	let contractTermsInput = $state('Standard Payjeezy 12-Month Merchant Processing Agreement at 1.45% + $0.10 per transaction rate with Next-Day Direct Bank Settlements.');
	let showContractForm = $state(false);

	interface NoteComment {
		id: string;
		text: string;
		createdAt: string;
		author: string;
	}

	let noteComments = $state<NoteComment[]>([]);
	let newCommentText = $state('');
	let isSavingNotes = $state(false);
	let isNotesExpanded = $state(false);
	let notesSavedFeedback = $state(false);

	function parseNotes(rawNotes: string | null | undefined): NoteComment[] {
		if (!rawNotes || !rawNotes.trim()) return [];

		try {
			const parsed = JSON.parse(rawNotes);
			if (Array.isArray(parsed)) {
				return parsed.map((item, idx) => ({
					id: item.id || `note-${idx}-${Date.now()}`,
					text: item.text || String(item),
					createdAt: item.createdAt || new Date().toISOString(),
					author: item.author || 'CRM Admin'
				}));
			}
		} catch {
			// Legacy plain text note fallback
		}

		return [
			{
				id: `legacy-${Date.now()}`,
				text: rawNotes.trim(),
				createdAt: lead?.createdAt || new Date().toISOString(),
				author: 'CRM Admin'
			}
		];
	}

	let visibleComments = $derived.by(() => {
		if (isNotesExpanded) return noteComments;
		return noteComments.slice(0, 3);
	});

	$effect(() => {
		if (lead && isOpen) {
			noteComments = parseNotes(lead.notes);
			newCommentText = '';
			isNotesExpanded = false;
			fetchEmailLogs(lead.id);
			fetchContractInfo(lead.id);
			clientNameInput = lead.businessName + ' (Owner)';
			clientEmailInput = lead.email;
		}
	});

	let isDeleteCommentConfirmOpen = $state(false);
	let commentToDeleteId = $state<string | null>(null);

	async function postNewNoteComment() {
		if (!lead || !newCommentText.trim()) return;

		const newComment: NoteComment = {
			id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
			text: newCommentText.trim(),
			createdAt: new Date().toISOString(),
			author: 'CRM Admin'
		};

		const updatedList = [newComment, ...noteComments];
		noteComments = updatedList;
		newCommentText = '';

		await persistNotesToDb(updatedList);
		toastStore.success('Note posted', 'Saved internal comment entry to merchant log.');
	}

	function promptDeleteNoteComment(commentId: string) {
		commentToDeleteId = commentId;
		isDeleteCommentConfirmOpen = true;
	}

	async function confirmDeleteNoteComment() {
		if (!commentToDeleteId) return;
		const updatedList = noteComments.filter((c) => c.id !== commentToDeleteId);
		noteComments = updatedList;
		commentToDeleteId = null;
		await persistNotesToDb(updatedList);
		toastStore.success('Note deleted', 'Removed processing note entry.');
	}

	async function persistNotesToDb(comments: NoteComment[]) {
		if (!lead) return;
		isSavingNotes = true;
		notesSavedFeedback = false;

		const jsonPayload = JSON.stringify(comments);
		try {
			const res = await fetch('/api/leads/notes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: lead.id, notes: jsonPayload })
			});
			if (res.ok) {
				lead.notes = jsonPayload;
				notesSavedFeedback = true;
				setTimeout(() => (notesSavedFeedback = false), 2500);
			}
		} catch (e) {
			console.error('Failed to save notes:', e);
		} finally {
			isSavingNotes = false;
		}
	}

	function formatNoteTime(dateStr: string): string {
		try {
			const date = new Date(dateStr);
			const now = new Date();
			const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

			if (diffSec < 60) return 'Just now';
			if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
			if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
			return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch {
			return dateStr;
		}
	}

	async function fetchEmailLogs(leadId: number) {
		try {
			const res = await fetch(`/api/emails?leadId=${leadId}`);
			if (res.ok) {
				emailLogs = await res.json();
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function fetchContractInfo(leadId: number) {
		try {
			const res = await fetch(`/api/contracts/info?leadId=${leadId}`);
			if (res.ok) {
				const info = await res.json();
				contractInfo = info;
				if (info) {
					clientNameInput = info.clientName || (lead.businessName + ' (Owner)');
					clientEmailInput = info.clientEmail || lead.email;
					servicePackageInput = info.servicePackage || 'Growth Pro Merchant Package';
					monthlyFeeInput = info.monthlyFee || '$199 / month';
					contractTermsInput = info.contractTerms || contractTermsInput;
					showContractForm = false;
				} else {
					showContractForm = true;
				}
			}
		} catch (e) {
			console.error(e);
		}
	}

	async function generatePdf() {
		if (!lead) return;
		isGeneratingPdf = true;
		pdfFeedback = '';

		try {
			const res = await fetch('/api/contracts/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					leadId: lead.id,
					clientName: clientNameInput,
					clientEmail: clientEmailInput,
					servicePackage: servicePackageInput,
					monthlyFee: monthlyFeeInput,
					contractTerms: contractTermsInput
				})
			});

			const data = await res.json();
			if (res.ok && data.success) {
				pdfFeedback = 'Contract PDF generated successfully!';
				fetchContractInfo(lead.id);
				setTimeout(() => (pdfFeedback = ''), 4000);
			} else {
				pdfFeedback = data.message || 'Failed to generate contract PDF.';
			}
		} catch (e: any) {
			pdfFeedback = e?.message || 'Error generating PDF contract.';
		} finally {
			isGeneratingPdf = false;
		}
	}

	async function updateContractStatus(newStatus: 'SIGNED' | 'PENDING_SIGNATURE') {
		if (!contractInfo) return;
		try {
			const res = await fetch('/api/contracts/status', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ contractId: contractInfo.id, status: newStatus })
			});
			if (res.ok) {
				fetchContractInfo(lead.id);
			}
		} catch (e) {
			console.error(e);
		}
	}

	function handleTemplateSelect(e: Event) {
		const target = e.target as HTMLSelectElement;
		const id = Number(target.value);
		const tmpl = emailTemplates.find((t) => t.id === id);
		if (tmpl && lead) {
			emailSubject = tmpl.subject;
			emailBody = tmpl.bodyHtml
				.replace(/\{\{\s*businessName\s*\}\}/g, lead.businessName)
				.replace(/\{\{\s*email\s*\}\}/g, lead.email)
				.replace(/\{\{\s*phone\s*\}\}/g, lead.phone)
				.replace(/\{\{\s*funnelLink\s*\}\}/g, `${window.location.origin}/funnel`);
		}
	}

	async function sendCustomEmail() {
		if (!emailSubject || !emailBody) {
			sendFeedback = 'Subject and body are required.';
			return;
		}

		isSending = true;
		sendFeedback = '';

		try {
			const res = await fetch('/api/emails/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					leadId: lead.id,
					templateId: selectedTemplateId ? Number(selectedTemplateId) : null,
					subject: emailSubject,
					bodyHtml: emailBody
				})
			});

			if (res.ok) {
				sendFeedback = 'Email sent successfully!';
				emailSubject = '';
				emailBody = '';
				fetchEmailLogs(lead.id);
				setTimeout(() => (sendFeedback = ''), 3000);
			} else {
				sendFeedback = 'Failed to send email.';
			}
		} catch (err: any) {
			sendFeedback = err?.message || 'Email send failed';
		} finally {
			isSending = false;
		}
	}
</script>

{#if isOpen && lead}
	<!-- Backdrop -->
	<div class="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
		<!-- Sliding Drawer Panel -->
		<div class="glass-panel w-full max-w-xl h-full border-l border-slate-200 dark:border-purple-500/30 p-6 flex flex-col justify-between overflow-y-auto space-y-6 shadow-2xl relative bg-white dark:bg-slate-900">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
				<div>
					<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30">
						LEAD PROFILE #{lead.id}
					</span>
					<h3 class="text-xl font-bold text-slate-900 dark:text-slate-100 font-display mt-1">{lead.businessName}</h3>
				</div>
				<button onclick={() => (isOpen = false)} class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Contact Meta Cards with Multi-Contact Detection & Copy to Clipboard -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
				<!-- Email Card -->
				<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
					<div class="flex items-center justify-between">
						<span class="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-bold">
							<Mail class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
							Email {allEmails.length > 1 ? `(${allEmails.length})` : ''}
						</span>
						{#if allEmails.length > 1}
							<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300">
								Multiple Emails
							</span>
						{/if}
					</div>

					{#if allEmails.length === 0}
						<div class="text-slate-400 italic text-[11px]">No email address provided</div>
					{:else}
						<div class="space-y-1.5">
							{#each allEmails as emailAddr, idx}
								<div class="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-2xs group">
									<div class="flex items-center gap-1.5 overflow-hidden">
										{#if idx > 0}
											<span class="px-1 py-0.2 rounded text-[9px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 flex-shrink-0">ALT</span>
										{/if}
										<span class="font-bold text-slate-900 dark:text-slate-200 truncate select-all">{emailAddr}</span>
									</div>
									<button
										type="button"
										onclick={() => copyToClipboard(emailAddr, `email-${idx}`)}
										class="p-1 rounded-md text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 cursor-pointer"
										title="Copy email to clipboard"
									>
										{#if copiedField === `email-${idx}`}
											<Check class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-scale" />
										{:else}
											<Copy class="w-3.5 h-3.5" />
										{/if}
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Phone Card -->
				<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
					<div class="flex items-center justify-between">
						<span class="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-bold">
							<Phone class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
							Phone {allPhones.length > 1 ? `(${allPhones.length})` : ''}
						</span>
						{#if allPhones.length > 1}
							<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300">
								Multiple Numbers
							</span>
						{/if}
					</div>

					{#if allPhones.length === 0}
						<div class="text-slate-400 italic text-[11px]">No phone number provided</div>
					{:else}
						<div class="space-y-1.5">
							{#each allPhones as phoneNum, idx}
								<div class="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-2xs group">
									<div class="flex items-center gap-1.5 overflow-hidden">
										{#if idx > 0}
											<span class="px-1 py-0.2 rounded text-[9px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 flex-shrink-0">ALT</span>
										{/if}
										<span class="font-bold text-slate-900 dark:text-slate-200 truncate select-all">{phoneNum}</span>
									</div>
									<button
										type="button"
										onclick={() => copyToClipboard(phoneNum, `phone-${idx}`)}
										class="p-1 rounded-md text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 cursor-pointer"
										title="Copy phone number to clipboard"
									>
										{#if copiedField === `phone-${idx}`}
											<Check class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-scale" />
										{:else}
											<Copy class="w-3.5 h-3.5" />
										{/if}
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Facebook-Style Lead Processing Notes Thread -->
			<div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
				<div class="flex items-center justify-between">
					<span class="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-bold text-xs">
						<MessageSquare class="w-4 h-4 text-purple-600 dark:text-purple-400" />
						Lead Activity & Processing Notes ({noteComments.length})
					</span>
					{#if notesSavedFeedback}
						<span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fade-in">
							<CheckCircle2 class="w-3.5 h-3.5" /> Saved!
						</span>
					{/if}
				</div>

				<!-- Facebook-Style Note Composer Box -->
				<div class="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
					<textarea
						bind:value={newCommentText}
						rows="2"
						placeholder="Write an internal note or update (e.g. equipment needed, callback preference)..."
						class="w-full p-2 text-xs font-medium bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-y min-h-[50px]"
					></textarea>
					<div class="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
						<span class="text-[10px] text-slate-400 font-medium">Logged as <span class="font-bold text-purple-600 dark:text-purple-400">CRM Admin</span></span>
						<button
							type="button"
							disabled={isSavingNotes || !newCommentText.trim()}
							onclick={postNewNoteComment}
							class="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-40 shadow-xs"
						>
							{#if isSavingNotes}
								<div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
								<span>Posting...</span>
							{:else}
								<Send class="w-3 h-3" />
								<span>Post Note</span>
							{/if}
						</button>
					</div>
				</div>

				<!-- Comments Thread Stream -->
				{#if noteComments.length === 0}
					<div class="p-4 text-center text-slate-400 dark:text-slate-500 text-xs italic bg-white/50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
						No processing notes logged yet. Type above to add the first note.
					</div>
				{:else}
					<div class="space-y-2.5 max-h-72 overflow-y-auto custom-notes-scrollbar pr-1">
						{#each visibleComments as comment (comment.id)}
							<div class="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs group transition-all">
								<div class="flex items-start justify-between gap-2">
									<div class="flex items-center gap-2">
										<div class="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs flex-shrink-0">
											{comment.author.split(' ').map((n) => n[0]).join('')}
										</div>
										<div>
											<span class="text-xs font-bold text-slate-900 dark:text-slate-100">{comment.author}</span>
											<span class="text-[10px] text-slate-400 font-medium ml-1.5">{formatNoteTime(comment.createdAt)}</span>
										</div>
									</div>

									<button
										type="button"
										onclick={() => promptDeleteNoteComment(comment.id)}
										class="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
										title="Delete note entry"
									>
										<Trash2 class="w-3.5 h-3.5" />
									</button>
								</div>

								<p class="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1.5 pl-8 whitespace-pre-wrap leading-relaxed">
									{comment.text}
								</p>
							</div>
						{/each}
					</div>

					<!-- Expand / Collapse 3-Note Limit Controls -->
					{#if noteComments.length > 3}
						<div class="pt-1 text-center">
							<button
								type="button"
								onclick={() => (isNotesExpanded = !isNotesExpanded)}
								class="px-3 py-1 rounded-full bg-slate-200/70 hover:bg-purple-100 text-slate-700 hover:text-purple-900 dark:bg-slate-800 dark:hover:bg-purple-950/40 dark:text-slate-300 dark:hover:text-purple-300 border border-slate-300/60 dark:border-slate-700/60 text-[11px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
							>
								{#if isNotesExpanded}
									<span>Collapse notes</span>
									<ChevronUp class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
								{:else}
									<span>Show {noteComments.length - 3} previous {noteComments.length - 3 === 1 ? 'note' : 'notes'}</span>
									<ChevronDown class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
								{/if}
							</button>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Contract & Admin PDF Generation Section -->
			<div class="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
				<div class="flex items-center justify-between">
					<h4 class="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
						<FileText class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Merchant Agreement & PDF Contract
					</h4>

					{#if contractInfo && !showContractForm}
						<button
							onclick={() => (showContractForm = true)}
							class="text-[11px] text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 font-bold"
						>
							<Edit3 class="w-3 h-3" /> Edit Details
						</button>
					{/if}
				</div>

				{#if pdfFeedback}
					<div class="p-2.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30 text-xs font-bold flex items-center gap-2">
						<CheckCircle2 class="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
						<span>{pdfFeedback}</span>
					</div>
				{/if}

				{#if contractInfo && !showContractForm}
					<div class="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2 shadow-xs">
						<div class="flex justify-between">
							<span class="text-slate-500 font-medium">Selected Package:</span>
							<span class="font-bold text-purple-800 dark:text-purple-300">{contractInfo.servicePackage} ({contractInfo.monthlyFee})</span>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-500 font-medium">Representative:</span>
							<span class="text-slate-900 dark:text-slate-200 font-semibold">{contractInfo.clientName} ({contractInfo.clientEmail})</span>
						</div>
						<div class="flex justify-between">
							<span class="text-slate-500 font-medium">Contract ID:</span>
							<span class="font-mono text-cyan-800 dark:text-cyan-300 font-bold">{contractInfo.id}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-slate-500 font-medium">Contract Status:</span>
							<div class="flex items-center gap-2">
								<span class="font-bold px-2 py-0.5 rounded text-[11px] {contractInfo.status === 'SIGNED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'}">
									{contractInfo.status === 'PENDING_SIGNATURE' ? 'PENDING SIGNATURE' : contractInfo.status}
								</span>
								{#if contractInfo.status === 'SIGNED'}
									<button
										type="button"
										onclick={() => updateContractStatus('PENDING_SIGNATURE')}
										class="text-[10px] text-amber-700 dark:text-amber-400 hover:underline font-bold"
										title="Mark status as Pending Signature"
									>
										(Mark Unsigned)
									</button>
								{:else}
									<button
										type="button"
										onclick={() => updateContractStatus('SIGNED')}
										class="text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline font-bold"
										title="Mark status as Signed"
									>
										(Mark Signed)
									</button>
								{/if}
							</div>
						</div>
					</div>

					<div class="flex gap-2">
						{#if contractInfo.pdfPath}
							<a
								href="/api/contracts/{contractInfo.id}/download"
								class="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5 py-2 shadow-sm"
							>
								<FileText class="w-3.5 h-3.5" />
								Download PDF Contract
							</a>
						{/if}
						<button
							onclick={() => (showContractForm = true)}
							class="btn-secondary text-xs flex items-center justify-center gap-1.5 py-2 px-3 shadow-xs"
						>
							Edit & Regenerate
						</button>
					</div>
				{:else}
					<!-- Contract Setup & Parameter Form -->
					<form onsubmit={(e) => { e.preventDefault(); generatePdf(); }} class="space-y-3 p-3.5 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
						<div>
							<label for="rep_name" class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Client / Representative Name *</label>
							<input
								id="rep_name"
								type="text"
								required
								bind:value={clientNameInput}
								placeholder="e.g. Sarah Jenkins (Owner)"
								class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-600 shadow-xs"
							/>
						</div>

						<div>
							<label for="rep_email" class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Client Email Address *</label>
							<input
								id="rep_email"
								type="email"
								required
								bind:value={clientEmailInput}
								placeholder="owner@business.com"
								class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-600 shadow-xs"
							/>
						</div>



						<div class="flex items-center justify-end gap-2 pt-1">
							{#if contractInfo}
								<button
									type="button"
									onclick={() => (showContractForm = false)}
									class="btn-secondary text-xs py-1.5 px-3"
								>
									Cancel
								</button>
							{/if}
							<button
								type="submit"
								disabled={isGeneratingPdf}
								class="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5 py-2 shadow-sm"
							>
								<FileText class="w-3.5 h-3.5" />
								{isGeneratingPdf ? 'Generating PDF...' : 'Generate & Save Contract PDF'}
							</button>
						</div>
					</form>
				{/if}
			</div>

			<!-- Quick Email Sender Section -->
			<div class="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
				<h4 class="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
					<Send class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Send Custom Email
				</h4>

				{#if emailTemplates.length > 0}
					<div>
						<label for="detail-template-select" class="block text-[11px] font-bold text-slate-700 dark:text-slate-400 mb-1">Apply Script Template</label>
						<select
							id="detail-template-select"
							bind:value={selectedTemplateId}
							onchange={handleTemplateSelect}
							class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-200 font-semibold"
						>
							<option value="">-- Choose Template --</option>
							{#each emailTemplates as tmpl}
								<option value={tmpl.id}>{tmpl.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				<div>
					<input
						type="text"
						placeholder="Email Subject..."
						bind:value={emailSubject}
						class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-purple-600 shadow-xs"
					/>
				</div>

				<div>
					<textarea
						rows="3"
						placeholder="Email HTML/text content..."
						bind:value={emailBody}
						class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-purple-600 shadow-xs"
					></textarea>
				</div>

				{#if sendFeedback}
					<div class="text-xs font-bold text-emerald-700 dark:text-emerald-400">{sendFeedback}</div>
				{/if}

				<button
					onclick={sendCustomEmail}
					disabled={isSending}
					class="btn-primary text-xs w-full flex items-center justify-center gap-2 shadow-sm"
				>
					{isSending ? 'Sending...' : 'Dispatch Email Now'}
				</button>
			</div>

			<!-- Email History Timeline with Expanded View & Full Email Modal -->
			<div class="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
				<div class="flex items-center justify-between">
					<h4 class="text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
						<Clock class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
						Communication Timeline {emailLogs.length > 0 ? `(${emailLogs.length})` : ''}
					</h4>

					<a
						href="/emails?leadId={lead.id}"
						class="text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-500/30 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
						title="Access full email communications inbox for this lead"
					>
						<Inbox class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
						<span>Access Inbox</span>
						<ExternalLink class="w-3 h-3 text-slate-400" />
					</a>
				</div>

				<div class="space-y-2 max-h-60 overflow-y-auto pr-1">
					{#each emailLogs as log}
						<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 text-xs space-y-2 shadow-xs transition-all hover:border-purple-300 dark:hover:border-purple-500/40">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2 overflow-hidden">
									<span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 flex-shrink-0">
										{log.direction || 'OUTBOUND'}
									</span>
									<span class="font-bold text-slate-900 dark:text-slate-100 truncate">{log.subject}</span>
								</div>
								<span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex-shrink-0">
									{new Date(log.sentAt).toLocaleDateString()}
								</span>
							</div>

							<div class="text-[11px] text-slate-600 dark:text-slate-300 font-mono flex items-center justify-between border-t border-b border-slate-200/60 dark:border-slate-800/60 py-1">
								<span class="truncate">From: <strong class="text-slate-800 dark:text-slate-200">{log.sender}</strong> → <strong class="text-slate-800 dark:text-slate-200">{log.recipient}</strong></span>
							</div>

							<!-- Inline Preview / Expanded View -->
							{#if expandedLogId === log.id}
								<div class="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[12px] text-slate-900 dark:text-slate-100 space-y-2 shadow-inner overflow-x-auto">
									{@html log.bodyHtml}
								</div>
							{:else}
								<div class="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
									{@html log.bodyHtml.replace(/<[^>]*>?/gm, '')}
								</div>
							{/if}

							<!-- Action Icon Buttons for Timeline Item -->
							<div class="flex items-center justify-end gap-1.5 pt-1">
								<button
									type="button"
									onclick={() => (expandedLogId = expandedLogId === log.id ? null : log.id)}
									class="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 dark:text-slate-400 dark:hover:text-purple-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
									title={expandedLogId === log.id ? "Collapse Inline" : "Expand Inline"}
								>
									{#if expandedLogId === log.id}
										<ChevronUp class="w-4 h-4 text-purple-600 dark:text-purple-400" />
									{:else}
										<ChevronDown class="w-4 h-4" />
									{/if}
								</button>

								<button
									type="button"
									onclick={() => (modalViewLog = log)}
									class="p-1.5 rounded-lg text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/60 transition-colors cursor-pointer"
									title="Open Full View Modal"
								>
									<Maximize2 class="w-4 h-4 text-purple-600 dark:text-purple-400" />
								</button>

								<a
									href="/emails?leadId={lead.id}"
									class="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 dark:text-slate-400 dark:hover:text-purple-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
									title="Access Full Communications Inbox"
								>
									<Inbox class="w-4 h-4" />
								</a>
							</div>
						</div>
					{:else}
						<div class="p-4 text-center text-slate-500 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
							No email communications sent to this lead yet.
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Dedicated Full Email View Modal -->
{#if modalViewLog}
	<div class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
		<div class="glass-panel w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 flex flex-col space-y-4 relative overflow-hidden">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<div class="space-y-1">
					<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300">
						FULL EMAIL RECORD #{modalViewLog.id}
					</span>
					<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">{modalViewLog.subject}</h3>
				</div>
				<button onclick={() => (modalViewLog = null)} class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Email Metadata Header -->
			<div class="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
				<div>
					<span class="text-slate-500 font-medium">From:</span>
					<span class="font-bold text-slate-900 dark:text-slate-200 block truncate">{modalViewLog.sender}</span>
				</div>
				<div>
					<span class="text-slate-500 font-medium">To:</span>
					<span class="font-bold text-slate-900 dark:text-slate-200 block truncate">{modalViewLog.recipient}</span>
				</div>
				<div class="col-span-2 pt-1 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
					<span class="text-slate-500">Sent Date & Time:</span>
					<span class="font-mono font-bold text-slate-800 dark:text-slate-300">{new Date(modalViewLog.sentAt).toLocaleString()}</span>
				</div>
			</div>

			<!-- Rendered Full Email Body -->
			<div class="flex-1 overflow-y-auto p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 space-y-3 shadow-inner leading-relaxed select-all">
				{@html modalViewLog.bodyHtml}
			</div>

			<!-- Modal Footer -->
			<div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
				<button
					type="button"
					onclick={() => copyToClipboard(modalViewLog.bodyHtml.replace(/<[^>]*>?/gm, ''), 'modal-email-body')}
					class="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
				>
					{#if copiedField === 'modal-email-body'}
						<Check class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
						<span>Copied Body Text</span>
					{:else}
						<Copy class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
						<span>Copy Email Text</span>
					{/if}
				</button>

				<button
					type="button"
					onclick={() => (modalViewLog = null)}
					class="btn-primary text-xs px-4 cursor-pointer"
				>
					Close Window
				</button>
			</div>
		</div>
	</div>
{/if}

<ConfirmModal
	bind:isOpen={isDeleteCommentConfirmOpen}
	title="Delete Note Comment?"
	message="Are you sure you want to delete this internal processing note entry? This action cannot be undone."
	confirmText="Delete Note"
	variant="danger"
	onConfirm={confirmDeleteNoteComment}
/>
