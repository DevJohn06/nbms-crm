<script lang="ts">
	import Papa from 'papaparse';
	import * as XLSX from 'xlsx';
	import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, X, ArrowRight, Loader2 } from 'lucide-svelte';

	let {
		isOpen = $bindable(false),
		onImportSuccess,
		availableVerticals = []
	}: {
		isOpen: boolean;
		onImportSuccess?: () => void;
		availableVerticals?: Array<{ id: string; name: string }>;
	} = $props();

	let fileInput = $state<HTMLInputElement>();
	let fileName = $state('');
	let parsedRows = $state<any[]>([]);
	let headers = $state<string[]>([]);

	let selectedVerticalId = $state('');

	$effect(() => {
		if (availableVerticals.length > 0 && !selectedVerticalId) {
			selectedVerticalId = availableVerticals[0].id;
		}
	});

	let colBusiness = $state('');
	let colEmail = $state('');
	let colSecondaryEmail = $state('');
	let colPhone = $state('');
	let colStatus = $state('');

	let isProcessing = $state(false);
	let isDragging = $state(false);
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	// Upload progress states
	let importProgress = $state(0);
	let processedCount = $state(0);
	let totalCount = $state(0);
	let totalCreated = $state(0);
	let totalCollated = $state(0);
	let currentBatchIndex = $state(0);
	let totalBatches = $state(0);
	let isFinished = $state(false);

	function autoDetectColumns(detectedHeaders: string[]) {
		const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

		for (const h of detectedHeaders) {
			const n = norm(h);
			if (!colBusiness && (n.includes('business') || n.includes('company') || n.includes('name') || n.includes('merchant'))) {
				colBusiness = h;
			} else if (!colSecondaryEmail && (n.includes('secondaryemail') || n.includes('altemail') || n.includes('email2') || n.includes('supplementary'))) {
				colSecondaryEmail = h;
			} else if (!colEmail && n.includes('email')) {
				colEmail = h;
			} else if (!colPhone && (n.includes('phone') || n.includes('mobile') || n.includes('contact') || n.includes('tel'))) {
				colPhone = h;
			} else if (!colStatus && (n.includes('status') || n.includes('stage') || n.includes('state'))) {
				colStatus = h;
			}
		}

		// Fallback assignments if not matched
		if (!colBusiness && detectedHeaders[0]) colBusiness = detectedHeaders[0];
		if (!colEmail && detectedHeaders[1]) colEmail = detectedHeaders[1];
		if (!colPhone && detectedHeaders[2]) colPhone = detectedHeaders[2];
	}

	function processFile(file: File) {
		if (!file) return;

		fileName = file.name;
		isProcessing = true;
		errorMessage = '';

		const ext = file.name.split('.').pop()?.toLowerCase();

		if (ext === 'csv') {
			Papa.parse(file, {
				header: true,
				skipEmptyLines: true,
				complete: (results) => {
					isProcessing = false;
					if (results.data && results.data.length > 0) {
						headers = Object.keys(results.data[0] as object);
						parsedRows = results.data;
						autoDetectColumns(headers);
					} else {
						errorMessage = 'CSV file is empty or formatted incorrectly.';
					}
				},
				error: (err) => {
					isProcessing = false;
					errorMessage = `CSV Parsing Error: ${err.message}`;
				}
			});
		} else if (ext === 'xlsx' || ext === 'xls') {
			const reader = new FileReader();
			reader.onload = (evt) => {
				try {
					const data = new Uint8Array(evt.target?.result as ArrayBuffer);
					const workbook = XLSX.read(data, { type: 'array' });
					const firstSheetName = workbook.SheetNames[0];
					const worksheet = workbook.Sheets[firstSheetName];
					const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

					isProcessing = false;
					if (json && json.length > 0) {
						headers = Object.keys(json[0]);
						parsedRows = json;
						autoDetectColumns(headers);
					} else {
						errorMessage = 'Excel worksheet is empty.';
					}
				} catch (err: any) {
					isProcessing = false;
					errorMessage = `Excel Parsing Error: ${err?.message || 'Failed to read file'}`;
				}
			};
			reader.readAsArrayBuffer(file);
		} else {
			isProcessing = false;
			errorMessage = 'Unsupported file format. Please upload a .csv, .xls, or .xlsx file.';
		}
	}

	function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			processFile(file);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			processFile(files[0]);
		}
	}

	async function submitImport() {
		if (!colBusiness || !colEmail || !colPhone) {
			errorMessage = 'Please map Business Name, Email, and Phone columns.';
			return;
		}

		errorMessage = '';
		isSubmitting = true;
		isFinished = false;
		importProgress = 0;
		processedCount = 0;
		totalCreated = 0;
		totalCollated = 0;

		const mappedLeads = parsedRows.map((row) => {
			const rawStatus = colStatus && row[colStatus] ? String(row[colStatus]).trim().toUpperCase() : 'NEW';
			let validStatus = 'NEW';
			if (['EMAILED', 'CONTACTED', 'FUNNEL_COMPLETED', 'CONTRACT_SENT', 'CONTRACT_SIGNED', 'LOST'].includes(rawStatus)) {
				validStatus = rawStatus;
			}

			// Automatically split multiple emails if formatted in one cell
			const rawEmail = String(row[colEmail] || '').trim();
			const tokens = rawEmail
				.split(/[\s,;]+/)
				.map((e) => e.trim().replace(/^[<(\[]+|[>)\]]+$/g, ''))
				.filter((e) => e.includes('@'));

			let mainEmail = rawEmail;
			let secEmail = colSecondaryEmail && row[colSecondaryEmail] ? String(row[colSecondaryEmail]).trim() : '';

			if (tokens.length > 1) {
				mainEmail = tokens[0];
				const remaining = tokens.slice(1);
				if (secEmail) remaining.push(secEmail);
				secEmail = Array.from(new Set(remaining)).join(', ');
			}

			return {
				businessName: String(row[colBusiness] || '').trim(),
				email: mainEmail,
				secondaryEmail: secEmail || undefined,
				phone: String(row[colPhone] || '').trim(),
				status: validStatus,
				notes: `Uploaded via ${fileName}`
			};
		}).filter((l) => l.businessName.length > 0 && l.email.length > 0);

		if (mappedLeads.length === 0) {
			errorMessage = 'No valid leads found with business name and email.';
			isSubmitting = false;
			return;
		}

		totalCount = mappedLeads.length;
		const BATCH_SIZE = 50;
		totalBatches = Math.ceil(totalCount / BATCH_SIZE);

		try {
			for (let i = 0; i < totalCount; i += BATCH_SIZE) {
				currentBatchIndex = Math.floor(i / BATCH_SIZE) + 1;
				const chunk = mappedLeads.slice(i, i + BATCH_SIZE);

				const form = new FormData();
				form.append('leadsJson', JSON.stringify(chunk));
				form.append('verticalId', selectedVerticalId);

				const res = await fetch('/leads?/importBatch', {
					method: 'POST',
					body: form
				});

				if (!res.ok) {
					throw new Error(`Failed to upload batch ${currentBatchIndex} of ${totalBatches}`);
				}

				const resData = await res.json();
				if (resData?.data) {
					try {
						const parsed = typeof resData.data === 'string' ? JSON.parse(resData.data) : resData.data;
						if (parsed?.createdCount) totalCreated += parsed.createdCount;
						if (parsed?.collatedCount) totalCollated += parsed.collatedCount;
					} catch (e) {}
				}

				processedCount += chunk.length;
				importProgress = Math.min(100, Math.round((processedCount / totalCount) * 100));
			}

			isFinished = true;
			importProgress = 100;

			// Short pause to show completion notification before closing
			setTimeout(() => {
				isOpen = false;
				resetState();
				if (onImportSuccess) onImportSuccess();
				window.location.reload();
			}, 1200);
		} catch (err: any) {
			errorMessage = err.message || 'Import error occurred during batch processing';
			isSubmitting = false;
		}
	}

	function resetState() {
		fileName = '';
		parsedRows = [];
		headers = [];
		errorMessage = '';
		isDragging = false;
		isSubmitting = false;
		importProgress = 0;
		processedCount = 0;
		totalCount = 0;
		totalCreated = 0;
		totalCollated = 0;
		currentBatchIndex = 0;
		totalBatches = 0;
		isFinished = false;
	}
</script>

{#if isOpen}
	<!-- Modal Backdrop -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
		<div class="glass-panel w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-purple-500/30 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-2xl relative">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20 flex items-center justify-center shadow-xs">
						<FileSpreadsheet class="w-5 h-5" />
					</div>
					<div>
						<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">Upload Lead Master List</h3>
						<p class="text-xs text-slate-600 dark:text-slate-400">Import CSV or Excel (.xlsx) files directly into your CRM database</p>
					</div>
				</div>
				<button
					onclick={() => !isSubmitting && (isOpen = false)}
					disabled={isSubmitting}
					class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			{#if errorMessage}
				<div class="p-3 rounded-lg bg-rose-100 text-rose-900 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30 text-xs font-bold flex items-center gap-2">
					<AlertCircle class="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
					<span>{errorMessage}</span>
				</div>
			{/if}

			{#if isSubmitting}
				<!-- Upload Progress View -->
				<div class="py-8 px-4 space-y-6 text-center rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
					{#if !isFinished}
						<div class="relative w-16 h-16 mx-auto flex items-center justify-center">
							<div class="absolute inset-0 rounded-full border-4 border-purple-300 dark:border-purple-700 animate-ping opacity-30"></div>
							<div class="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30">
								<Loader2 class="w-7 h-7 animate-spin" />
							</div>
						</div>
						<div class="space-y-1">
							<h4 class="text-lg font-black text-slate-900 dark:text-slate-100 font-display">
								Uploading Lead Master List...
							</h4>
							<p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
								Batch {currentBatchIndex} of {totalBatches} • Processing records into CRM database
							</p>
						</div>
					{:else}
						<div class="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-bounce">
							<CheckCircle2 class="w-8 h-8" />
						</div>
						<div class="space-y-1">
							<h4 class="text-lg font-black text-emerald-600 dark:text-emerald-400 font-display">
								Import Completed!
							</h4>
							<p class="text-xs text-slate-600 dark:text-slate-300 font-bold">
								Successfully processed all {totalCount} leads ({totalCreated} new leads added, {totalCollated} existing leads updated)
							</p>
						</div>
					{/if}

					<!-- Animated Progress Bar -->
					<div class="space-y-2 max-w-lg mx-auto">
						<div class="flex items-center justify-between text-xs font-bold">
							<span class="text-slate-600 dark:text-slate-400">Uploading Progress</span>
							<span class="text-purple-700 dark:text-purple-300 font-extrabold text-sm">{importProgress}%</span>
						</div>

						<div class="w-full h-4 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-0.5 overflow-hidden shadow-inner relative">
							<div
								class="h-full rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-500 transition-all duration-300 ease-out shadow-sm relative overflow-hidden"
								style="width: {importProgress}%"
							>
								<div class="absolute inset-0 bg-white/20 animate-pulse"></div>
							</div>
						</div>

						<div class="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 pt-1">
							<span>{processedCount} of {totalCount} leads uploaded</span>
							<span class="truncate max-w-[200px]">{fileName}</span>
						</div>
					</div>
				</div>
			{:else if parsedRows.length === 0}
				<!-- Drag & Drop Zone -->
				<div
					role="region"
					aria-label="CSV and Excel file drag and drop zone"
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					ondrop={handleDrop}
					class="border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer {isDragging ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 scale-[1.01]' : 'border-slate-300 dark:border-slate-800 hover:border-purple-400 bg-slate-50 dark:bg-slate-900/40'}"
				>
					<UploadCloud class="w-12 h-12 text-purple-600 dark:text-purple-400 mx-auto mb-3 {isDragging ? 'animate-bounce text-purple-700 dark:text-purple-300 scale-110' : ''}" />
					<p class="text-sm font-bold text-slate-900 dark:text-slate-200">
						{isDragging ? 'Drop your CSV / Excel file here' : 'Drag & drop your lead list here'}
					</p>
					<p class="text-xs text-slate-500 mt-1 font-medium">Supports CSV, XLS, and XLSX formats</p>
					<input
						bind:this={fileInput}
						type="file"
						accept=".csv, .xls, .xlsx"
						onchange={handleFileUpload}
						class="hidden"
					/>
					<button
						onclick={() => fileInput?.click()}
						class="btn-primary mt-4 text-xs inline-flex items-center gap-2 shadow-sm cursor-pointer"
					>
						Browse File
					</button>
				</div>
			{:else}
				<!-- Column Mapping & Preview Interface -->
				<div class="space-y-4">
					<div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
						<span class="text-slate-800 dark:text-slate-300 font-bold flex items-center gap-2">
							<CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
							Loaded {parsedRows.length} rows from <code class="text-purple-800 dark:text-purple-300 font-bold">{fileName}</code>
						</span>
						<button onclick={resetState} class="text-slate-500 dark:text-slate-400 hover:text-purple-700 dark:hover:text-white underline font-bold cursor-pointer">Change file</button>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
						<div>
							<label for="col-business" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Business Name Column *</label>
							<select id="col-business" bind:value={colBusiness} class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 font-semibold shadow-xs">
								{#each headers as h}
									<option value={h}>{h}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="col-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Main Email Column *</label>
							<select id="col-email" bind:value={colEmail} class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 font-semibold shadow-xs">
								{#each headers as h}
									<option value={h}>{h}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="col-secondary-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Supplementary Email (Optional)</label>
							<select id="col-secondary-email" bind:value={colSecondaryEmail} class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 font-semibold shadow-xs">
								<option value="">-- None (Auto-Split if in Main) --</option>
								{#each headers as h}
									<option value={h}>{h}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="col-phone" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number Column *</label>
							<select id="col-phone" bind:value={colPhone} class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 font-semibold shadow-xs">
								{#each headers as h}
									<option value={h}>{h}</option>
								{/each}
							</select>
						</div>
					</div>

					<!-- Target Vertical Selector -->
					<div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
						<label for="import-vertical" class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
							Target Industry Vertical *
						</label>
						<select
							id="import-vertical"
							bind:value={selectedVerticalId}
							class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-slate-100 focus:border-sky-500 font-semibold"
						>
							{#each availableVerticals as vert}
								<option value={vert.id}>{vert.name}</option>
							{/each}
							{#if availableVerticals.length === 0}
								<option value="mmj-dispensary">MMJ Dispensary (Default)</option>
							{/if}
						</select>
					</div>

					<!-- Preview Table Snippet -->
					<div class="space-y-1">
						<div class="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Preview (First 3 Leads)</div>
						<div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
							<table class="w-full text-left text-xs bg-white dark:bg-slate-900/60">
								<thead class="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold">
									<tr>
										<th class="p-2">Business Name</th>
										<th class="p-2">Email</th>
										<th class="p-2">Phone</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-100 dark:divide-slate-800">
									{#each parsedRows.slice(0, 3) as row}
										<tr>
											<td class="p-2 font-bold text-slate-900 dark:text-slate-200">{row[colBusiness] || '-'}</td>
											<td class="p-2 text-slate-600 dark:text-slate-400 font-mono">{row[colEmail] || '-'}</td>
											<td class="p-2 text-slate-600 dark:text-slate-400">{row[colPhone] || '-'}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
				<button
					onclick={() => (isOpen = false)}
					disabled={isSubmitting}
					class="btn-secondary text-xs disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
				>
					Cancel
				</button>
				{#if parsedRows.length > 0}
					<button
						onclick={submitImport}
						disabled={isSubmitting}
						class="btn-primary text-xs flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
					>
						{#if isSubmitting}
							<Loader2 class="w-4 h-4 animate-spin" />
							<span>Importing ({importProgress}%)...</span>
						{:else}
							<span>Confirm & Import {parsedRows.length} Leads</span>
							<ArrowRight class="w-4 h-4" />
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
