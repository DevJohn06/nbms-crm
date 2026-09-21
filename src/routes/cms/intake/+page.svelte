<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { toastStore } from '$lib/toast.svelte';
	import {
		Globe,
		Sparkles,
		CheckCircle2,
		AlertCircle,
		Save,
		Loader2,
		ExternalLink,
		Info,
		Layers,
		Phone,
		Plus,
		Trash2,
		Eye,
		EyeOff,
		GripVertical,
		ChevronRight,
		ChevronUp,
		ChevronDown,
		HelpCircle,
		ArrowUpDown,
		X
	} from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type SectionId = 'hero' | 'about' | 'how_it_works' | 'process_flow' | 'contact' | 'faqs' | 'footer';

	const sectionMeta: Record<SectionId, { name: string; icon: any; colorClass: string }> = {
		hero: { name: 'Hero Section', icon: Sparkles, colorClass: 'text-[#1f71c1] dark:text-sky-400' },
		process_flow: { name: 'How NBMS Works & Key Points', icon: CheckCircle2, colorClass: 'text-emerald-600 dark:text-emerald-400' },
		how_it_works: { name: 'Product Showcase & Services', icon: Layers, colorClass: 'text-amber-600 dark:text-amber-400' },
		about: { name: 'About Section', icon: Info, colorClass: 'text-cyan-600 dark:text-cyan-400' },
		contact: { name: 'Contact & Support', icon: Phone, colorClass: 'text-purple-600 dark:text-purple-400' },
		faqs: { name: 'FAQs Accordion', icon: HelpCircle, colorClass: 'text-indigo-600 dark:text-indigo-400' },
		footer: { name: 'Footer & Final CTA', icon: ExternalLink, colorClass: 'text-rose-600 dark:text-rose-400' }
	};

	let sectionOrder = $state<string[]>(['hero', 'process_flow', 'how_it_works', 'about', 'contact', 'faqs', 'footer']);

	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	let isSavingOrder = $state(false);
	let isSavingSection = $state(false);
	let orderSavedToast = $state(false);
	let isReorderModalOpen = $state(false);

	$effect(() => {
		if (data.sectionOrder && Array.isArray(data.sectionOrder) && data.sectionOrder.length > 0) {
			untrack(() => {
				sectionOrder = data.sectionOrder;
			});
		}
	});

	// Direct form submit handler for use:enhance (prevents Svelte 5 reactive effect loops)
	function handleFormEnhance() {
		isSavingSection = true;
		return async ({ result, update }: { result: any; update: () => Promise<void> }) => {
			try {
				await update();
				if (result.type === 'success') {
					const msg = result.data?.message || 'Section updated successfully.';
					toastStore.success('CMS Section Saved', String(msg));
				} else if (result.type === 'failure') {
					const err = result.data?.error || 'Failed to save section.';
					toastStore.error('Save Failed', String(err));
				}
			} catch (e) {
				toastStore.error('Save Failed', 'An unexpected error occurred while saving.');
			} finally {
				isSavingSection = false;
			}
		};
	}

	async function saveSectionOrderToDb(newOrder: string[]) {
		isSavingOrder = true;
		const formData = new FormData();
		formData.append('verticalId', data.activeVerticalId || '');
		formData.append('orderJson', JSON.stringify(newOrder));
		try {
			const res = await fetch('?/saveSectionOrder', {
				method: 'POST',
				body: formData
			});
			if (res.ok) {
				orderSavedToast = true;
				toastStore.success('Section Order Saved', 'Intake landing page layout order updated.');
				setTimeout(() => (orderSavedToast = false), 3000);
			}
		} catch (e) {
			console.error('Failed to save section order', e);
			toastStore.error('Save Failed', 'Could not update section layout order.');
		} finally {
			isSavingOrder = false;
		}
	}

	function handleDragStart(e: DragEvent, index: number) {
		draggedIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex !== null && draggedIndex !== index) {
			dragOverIndex = index;
		}
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	function handleDrop(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex === null) return;
		const updated = [...sectionOrder];
		const [moved] = updated.splice(draggedIndex, 1);
		updated.splice(index, 0, moved);
		sectionOrder = updated;
		draggedIndex = null;
		dragOverIndex = null;
		saveSectionOrderToDb(updated);
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	function moveSection(fromIdx: number, toIdx: number) {
		if (toIdx < 0 || toIdx >= sectionOrder.length) return;
		const updated = [...sectionOrder];
		const [moved] = updated.splice(fromIdx, 1);
		updated.splice(toIdx, 0, moved);
		sectionOrder = updated;
		saveSectionOrderToDb(updated);
	}

	let activeTab = $state<SectionId>('hero');

	// Local reactive state for forms & sub-section visibility toggles
	let heroTitle = $state('');
	let heroSubtitle = $state('');
	let heroBadge = $state('');
	let heroTagline = $state('');
	let heroCta = $state('');
	let heroSecondaryCta = $state('');
	let heroHideBadge = $state(false);
	let heroHideCtas = $state(false);
	let heroHideSection = $state(false);

	let processTitle = $state('');
	let processSubtitle = $state('');
	let processPrimaryCta = $state('');
	let processSecondaryCta = $state('');
	let processKeyPoints = $state<Array<{ badge: string; title: string; desc: string; tag: string }>>([]);
	let processCtaBanner = $state({
		badge: 'Zero Merchant Fees',
		title: 'Ready to Eliminate Credit Card Processing Fees?',
		subtitle: 'Get an instant customized terminal proposal or schedule a direct consultation with our underwriting team today.',
		primaryCta: 'Get Info',
		secondaryCta: 'Book A Call'
	});
	let processHideKeyPoints = $state(false);
	let processHideCtaBanner = $state(false);
	let processHideSection = $state(false);

	let howTitle = $state('');
	let howSubtitle = $state('');
	let howFeatures = $state<Array<{ title: string; desc: string }>>([]);
	let howHardwareCta = $state({
		title: 'Ready to Upgrade Your Checkout Hardware?',
		subtitle: 'Start processing cashless Pin Debit payments with zero merchant fees and daily direct bank deposits.',
		primaryCta: 'Get Terminal Proposal',
		secondaryCta: 'Book Equipment Demo'
	});
	let howServicesSection = $state({
		title: 'Complete In-House ATM Solutions',
		subtitle1: 'From ATM processing to equipment, we offer a comprehensive set of solutions designed to streamline day-to-day business operations and increase your revenues.',
		subtitle2: 'From authorization to settlement, we efficiently handle the lifecycle of each transaction to ensure each is both valid and secure while providing comprehensive reporting with instant visibility of your ATM transactions.',
		checklist: ['ATM hardware', 'ATM compliance', 'Secure, real time transaction processing', 'ATM management platform', 'Powerful reporting tools', '24/7 support']
	});
	let howHideFeaturesGrid = $state(false);
	let howHideHardwareCta = $state(false);
	let howHideServicesSection = $state(false);
	let howHideSection = $state(false);

	let aboutTitle = $state('');
	let aboutSubtitle = $state('');
	let aboutDescription = $state('');
	let aboutNotice = $state('');
	let aboutFeatures = $state<Array<{ title: string; desc: string }>>([]);
	let aboutHideDescription = $state(false);
	let aboutHideNotice = $state(false);
	let aboutHideSection = $state(false);

	let contactTitle = $state('');
	let contactSubtitle = $state('');
	let contactEmail = $state('');
	let contactPhone = $state('');
	let contactHours = $state('');
	let contactNotice = $state('');
	let contactHidePhone = $state(false);
	let contactHideEmail = $state(false);
	let contactHideHours = $state(false);
	let contactHideNotice = $state(false);
	let contactHideSection = $state(false);

	let faqsTitle = $state('');
	let faqsSubtitle = $state('');
	let faqItems = $state<Array<{ question: string; answer: string }>>([]);
	let faqsHideFaqItems = $state(false);
	let faqsHideSection = $state(false);

	let footerCtaBanner = $state({
		title: 'Ready to Get Started with NBMS?',
		subtitle: 'Start processing cashless Pin Debit payments with zero merchant fees and daily direct bank deposits.',
		primaryCta: 'Get Info',
		secondaryCta: 'Book A Call'
	});
	let footerCopyright = $state('');
	let footerHideCtaBanner = $state(false);
	let footerHideSection = $state(false);

	$effect(() => {
		if (data.sections) {
			untrack(() => {
				const h = data.sections.hero;
				if (h) {
					heroTitle = h.title || '';
					heroSubtitle = h.subtitle || '';
					heroBadge = h.content?.badge || '';
					heroTagline = h.content?.tagline || '';
					heroCta = h.content?.primaryCta || '';
					heroSecondaryCta = h.content?.secondaryCta || '';
					heroHideBadge = !!h.content?.hideBadge;
					heroHideCtas = !!h.content?.hideCtas;
					heroHideSection = !!h.content?.hideSection;
				}

				const pf = data.sections.process_flow;
				if (pf) {
					processTitle = pf.title || 'What is an ATM Merchant Account?';
					processSubtitle = pf.subtitle || '';
					processPrimaryCta = pf.content?.primaryCta || 'Get Info';
					processSecondaryCta = pf.content?.secondaryCta || 'Book A Call';
					if (pf.content?.keyPoints && Array.isArray(pf.content.keyPoints) && pf.content.keyPoints.length > 0) {
						processKeyPoints = pf.content.keyPoints;
					}
					if (pf.content?.ctaBanner) {
						processCtaBanner = {
							badge: pf.content.ctaBanner.badge || 'Zero Merchant Fees',
							title: pf.content.ctaBanner.title || 'Ready to Eliminate Credit Card Processing Fees?',
							subtitle: pf.content.ctaBanner.subtitle || 'Get an instant customized terminal proposal or schedule a direct consultation with our underwriting team today.',
							primaryCta: pf.content.ctaBanner.primaryCta || 'Get Info',
							secondaryCta: pf.content.ctaBanner.secondaryCta || 'Book A Call'
						};
					}
					processHideKeyPoints = !!pf.content?.hideKeyPoints;
					processHideCtaBanner = !!pf.content?.hideCtaBanner;
					processHideSection = !!pf.content?.hideSection;
				}

				const hw = data.sections.how_it_works;
				if (hw) {
					howTitle = hw.title || 'NBMS Pin Debit Cashless ATM Terminals';
					howSubtitle = hw.subtitle || '';
					if (hw.content?.features && Array.isArray(hw.content.features) && hw.content.features.length > 0) {
						howFeatures = hw.content.features;
					}
					if (hw.content?.hardwareCta) {
						howHardwareCta = {
							title: hw.content.hardwareCta.title || 'Ready to Upgrade Your Checkout Hardware?',
							subtitle: hw.content.hardwareCta.subtitle || 'Start processing cashless Pin Debit payments with zero merchant fees and daily direct bank deposits.',
							primaryCta: hw.content.hardwareCta.primaryCta || 'Get Terminal Proposal',
							secondaryCta: hw.content.hardwareCta.secondaryCta || 'Book Equipment Demo'
						};
					}
					if (hw.content?.servicesSection) {
						howServicesSection = {
							title: hw.content.servicesSection.title || 'Complete In-House ATM Solutions',
							subtitle1: hw.content.servicesSection.subtitle1 || 'From ATM processing to equipment, we offer a comprehensive set of solutions designed to streamline day-to-day business operations and increase your revenues.',
							subtitle2: hw.content.servicesSection.subtitle2 || 'From authorization to settlement, we efficiently handle the lifecycle of each transaction to ensure each is both valid and secure while providing comprehensive reporting with instant visibility of your ATM transactions.',
							checklist: Array.isArray(hw.content.servicesSection.checklist) ? hw.content.servicesSection.checklist : ['ATM hardware', 'ATM compliance', 'Secure, real time transaction processing', 'ATM management platform', 'Powerful reporting tools', '24/7 support']
						};
					}
					howHideFeaturesGrid = !!hw.content?.hideFeaturesGrid;
					howHideHardwareCta = !!hw.content?.hideHardwareCta;
					howHideServicesSection = !!hw.content?.hideServicesSection;
					howHideSection = !!hw.content?.hideSection;
				}

				const a = data.sections.about;
				if (a) {
					aboutTitle = a.title || '';
					aboutSubtitle = a.subtitle || '';
					aboutDescription = a.content?.description || '';
					aboutNotice = a.content?.transitionNotice || '';
					if (a.content?.features && Array.isArray(a.content.features)) {
						aboutFeatures = a.content.features;
					}
					aboutHideDescription = !!a.content?.hideDescription;
					aboutHideNotice = !!a.content?.hideNotice;
					aboutHideSection = !!a.content?.hideSection;
				}

				const c = data.sections.contact;
				if (c) {
					contactTitle = c.title || '';
					contactSubtitle = c.subtitle || '';
					contactEmail = c.content?.email || '';
					contactPhone = c.content?.phone || '';
					contactHours = c.content?.hours || '';
					contactNotice = c.content?.helpNotice || '';
					contactHidePhone = !!c.content?.hidePhone;
					contactHideEmail = !!c.content?.hideEmail;
					contactHideHours = !!c.content?.hideHours;
					contactHideNotice = !!c.content?.hideNotice;
					contactHideSection = !!c.content?.hideSection;
				}

				const fq = data.sections.faqs;
				if (fq) {
					faqsTitle = fq.title || 'Frequently Asked Questions';
					faqsSubtitle = fq.subtitle || '';
					if (fq.content?.items && Array.isArray(fq.content.items)) {
						faqItems = fq.content.items;
					}
					faqsHideFaqItems = !!fq.content?.hideFaqItems;
					faqsHideSection = !!fq.content?.hideSection;
				}

				const ft = data.sections.footer;
				if (ft) {
					if (ft.content?.ctaBanner) {
						footerCtaBanner = {
							title: ft.content.ctaBanner.title || 'Ready to Get Started with NBMS?',
							subtitle: ft.content.ctaBanner.subtitle || 'Start processing cashless Pin Debit payments with zero merchant fees and daily direct bank deposits.',
							primaryCta: ft.content.ctaBanner.primaryCta || 'Get Info',
							secondaryCta: ft.content.ctaBanner.secondaryCta || 'Book A Call'
						};
					}
					footerCopyright = ft.content?.copyright || '© 2026 NBMS INC. All rights reserved.';
					footerHideCtaBanner = !!ft.content?.hideCtaBanner;
					footerHideSection = !!ft.content?.hideSection;
				}
			});
		}
	});

	function addKeyPoint() {
		processKeyPoints = [
			...processKeyPoints,
			{ badge: 'Feature', title: 'New Key Point Advantage', desc: 'Advantage description text.', tag: 'Key benefit tag' }
		];
	}

	function removeKeyPoint(idx: number) {
		processKeyPoints = processKeyPoints.filter((_, i) => i !== idx);
	}

	function addHowFeature() {
		howFeatures = [...howFeatures, { title: 'New Terminal Feature', desc: 'Feature details and merchant advantages.' }];
	}

	function removeHowFeature(idx: number) {
		howFeatures = howFeatures.filter((_, i) => i !== idx);
	}

	function addChecklistItem() {
		howServicesSection.checklist = [...howServicesSection.checklist, 'New Service Advantage'];
	}

	function removeChecklistItem(idx: number) {
		howServicesSection.checklist = howServicesSection.checklist.filter((_, i) => i !== idx);
	}

	function addFaqItem() {
		faqItems = [...faqItems, { question: 'New Frequently Asked Question?', answer: 'Detailed answer response.' }];
	}

	function removeFaqItem(idx: number) {
		faqItems = faqItems.filter((_, i) => i !== idx);
	}

	let heroContentJson = $derived(
		JSON.stringify({
			badge: heroBadge,
			tagline: heroTagline,
			primaryCta: heroCta,
			secondaryCta: heroSecondaryCta,
			hideBadge: heroHideBadge,
			hideCtas: heroHideCtas,
			hideSection: heroHideSection
		})
	);

	let processContentJson = $derived(
		JSON.stringify({
			primaryCta: processPrimaryCta,
			secondaryCta: processSecondaryCta,
			keyPoints: processKeyPoints,
			ctaBanner: processCtaBanner,
			hideKeyPoints: processHideKeyPoints,
			hideCtaBanner: processHideCtaBanner,
			hideSection: processHideSection
		})
	);

	let howContentJson = $derived(
		JSON.stringify({
			features: howFeatures,
			hardwareCta: howHardwareCta,
			servicesSection: howServicesSection,
			hideFeaturesGrid: howHideFeaturesGrid,
			hideHardwareCta: howHideHardwareCta,
			hideServicesSection: howHideServicesSection,
			hideSection: howHideSection
		})
	);

	let aboutContentJson = $derived(
		JSON.stringify({
			description: aboutDescription,
			transitionNotice: aboutNotice,
			features: aboutFeatures,
			hideDescription: aboutHideDescription,
			hideNotice: aboutHideNotice,
			hideSection: aboutHideSection
		})
	);

	let contactContentJson = $derived(
		JSON.stringify({
			email: contactEmail,
			phone: contactPhone,
			hours: contactHours,
			helpNotice: contactNotice,
			hidePhone: contactHidePhone,
			hideEmail: contactHideEmail,
			hideHours: contactHideHours,
			hideNotice: contactHideNotice,
			hideSection: contactHideSection
		})
	);

	let faqsContentJson = $derived(
		JSON.stringify({
			items: faqItems,
			hideFaqItems: faqsHideFaqItems,
			hideSection: faqsHideSection
		})
	);

	let footerContentJson = $derived(
		JSON.stringify({
			ctaBanner: footerCtaBanner,
			copyright: footerCopyright,
			hideCtaBanner: footerHideCtaBanner,
			hideSection: footerHideSection
		})
	);
</script>

<svelte:head>
	<title>Intake Page CMS - NBMS CRM</title>
</svelte:head>

<div class="space-y-6 max-w-7xl mx-auto pb-12">
	<!-- Top Banner -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-panel p-6 rounded-2xl border border-purple-200 dark:border-purple-500/30 bg-gradient-to-r from-white via-purple-50 to-slate-50 dark:from-purple-950/40 dark:via-slate-900/60 dark:to-slate-950/80 shadow-xs">
		<div>
			<div class="flex items-center gap-2 mb-1">
				<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
					{data.verticalName || 'Dispensary'}
				</span>
			</div>
			<h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">Public Intake Page CMS</h1>
			<p class="text-xs text-slate-600 dark:text-slate-400 mt-1">
				Customize dynamic content sections, sub-sections, CTAs, and FAQs displayed on the public merchant intake portal for <strong class="text-purple-700 dark:text-purple-300">{data.verticalName}</strong>.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			{#if data.allVerticals && data.allVerticals.length > 0}
				<div class="flex items-center gap-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 rounded-xl px-3 py-1.5 shadow-2xs">
					<span class="text-[11px] font-bold text-slate-600 dark:text-slate-400">Vertical:</span>
					<select
						value={data.activeVerticalId || ''}
						onchange={(e) => {
							const val = (e.target as HTMLSelectElement).value;
							window.location.href = `/cms/intake?vertical=${val}`;
						}}
						class="bg-transparent text-xs text-purple-950 dark:text-purple-200 font-bold focus:outline-none cursor-pointer"
					>
						{#each data.allVerticals as v}
							<option value={v.id} class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{v.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			<a
				href={data.activeVerticalId ? `/funnel/${data.activeVerticalId}` : '/funnel'}
				target="_blank"
				rel="noopener noreferrer"
				title="Preview Landing Page"
				aria-label="Preview Landing Page"
				class="btn-secondary !p-2 inline-flex items-center justify-center self-start md:self-auto shadow-xs cursor-pointer"
			>
				<ExternalLink class="w-4 h-4" />
			</a>
		</div>
	</div>

	<!-- Main Sidebar + Editor Grid Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
		<!-- Left Sidebar Navigation Column -->
		<div class="lg:col-span-4 xl:col-span-3 space-y-4">
			<!-- Reorder Action Card -->
			<div class="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Layout Control</span>
					{#if orderSavedToast}
						<span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300">
							<CheckCircle2 class="w-3 h-3" /> Saved Live
						</span>
					{:else if isSavingOrder}
						<span class="text-[10px] font-bold text-purple-600 dark:text-purple-400 animate-pulse">
							Saving...
						</span>
					{/if}
				</div>

				<button
					type="button"
					onclick={() => (isReorderModalOpen = true)}
					class="w-full btn-secondary text-xs py-2.5 px-3 flex items-center justify-between gap-2 border-purple-200 dark:border-purple-500/40 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-purple-950 dark:text-purple-200 font-extrabold shadow-xs cursor-pointer group"
				>
					<div class="flex items-center gap-2">
						<ArrowUpDown class="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
						<span>Reorder Page Sections</span>
					</div>
					<span class="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-md font-bold">
						{sectionOrder.length}
					</span>
				</button>
			</div>

			<!-- Vertical Section Tabs Sidebar -->
			<div class="glass-panel p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs space-y-1">
				<div class="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
					<span>Sections Navigation</span>
					<span class="text-[10px] font-medium text-slate-400">Click tab to view</span>
				</div>

				{#each sectionOrder as secId, idx}
					{@const meta = sectionMeta[secId as SectionId]}
					{#if meta}
						<button
							type="button"
							onclick={() => (activeTab = secId as SectionId)}
							class="w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 border shadow-xs relative overflow-hidden group {activeTab === secId ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-950 dark:text-purple-100 border-purple-300 dark:border-purple-500/60 font-bold shadow-sm' : 'bg-transparent text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-800'}"
						>
							{#if activeTab === secId}
								<div class="absolute left-0 top-0 bottom-0 w-1 bg-purple-600 dark:bg-purple-400 rounded-r"></div>
							{/if}

							<div class="flex items-center gap-3 min-w-0">
								<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 {activeTab === secId ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}">
									<meta.icon class="w-4 h-4 {activeTab === secId ? 'text-white' : meta.colorClass}" />
								</div>
								<div class="min-w-0">
									<p class="text-xs font-extrabold truncate">{idx + 1}. {meta.name}</p>
									<p class="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">Section #{idx + 1} in layout</p>
								</div>
							</div>

							<ChevronRight class="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
						</button>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Right Main Content Editor Panel -->
		<div class="lg:col-span-8 xl:col-span-9 space-y-6">
			<!-- TAB 1: HERO SECTION -->
			{#if activeTab === 'hero'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-5">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value="hero" />
					<input type="hidden" name="contentJson" value={heroContentJson} />

					<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
						<div>
							<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
								<Sparkles class="w-4 h-4 text-purple-600 dark:text-purple-400" /> Hero Banner Configuration
							</h3>
							<p class="text-xs text-slate-500 dark:text-slate-400">Main headline, subheadline, tagline, and CTA labels at the top of the intake page.</p>
						</div>

						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => (heroHideSection = !heroHideSection)}
								title={heroHideSection ? 'Unhide Hero Section' : 'Hide Hero Section'}
								class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs {heroHideSection ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
							>
								{#if heroHideSection}
									<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
								{:else}
									<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
								{/if}
							</button>

							<button
								type="submit"
								disabled={isSavingSection}
								title={isSavingSection ? 'Saving...' : 'Save Changes'}
								aria-label={isSavingSection ? 'Saving...' : 'Save Changes'}
								class="btn-primary !p-2 rounded-xl flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if isSavingSection}
									<Loader2 class="w-4 h-4 animate-spin" />
								{:else}
									<Save class="w-4 h-4" />
								{/if}
							</button>
						</div>
					</div>

					<div class="space-y-4 text-xs">
						<div>
							<label for="hero-title" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Main Headline Title *</label>
							<input
								id="hero-title"
								type="text"
								name="title"
								required
								bind:value={heroTitle}
								class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs"
							/>
						</div>

						<div>
							<label for="hero-subtitle" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Subtitle Description *</label>
							<input
								id="hero-subtitle"
								type="text"
								name="subtitle"
								required
								bind:value={heroSubtitle}
								class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs"
							/>
						</div>

						<div class="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
							<div class="flex items-center justify-between">
								<label for="hero-tagline" class="font-bold text-slate-800 dark:text-slate-300 block">Highlight Tagline</label>
								<button
									type="button"
									onclick={() => (heroHideBadge = !heroHideBadge)}
									title={heroHideBadge ? 'Unhide Tagline' : 'Hide Tagline'}
									class="p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {heroHideBadge ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
								>
									{#if heroHideBadge}
										<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
									{:else}
										<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
									{/if}
								</button>
							</div>
							<input
								id="hero-tagline"
								type="text"
								bind:value={heroTagline}
								class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs {heroHideBadge ? 'opacity-50' : ''}"
							/>
						</div>

						<div class="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
							<div class="flex items-center justify-between">
								<h4 class="font-black text-xs text-slate-800 dark:text-slate-300 uppercase tracking-wider">CTA Buttons</h4>
								<button
									type="button"
									onclick={() => (heroHideCtas = !heroHideCtas)}
									title={heroHideCtas ? 'Unhide CTA Buttons' : 'Hide CTA Buttons'}
									class="p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {heroHideCtas ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
								>
									{#if heroHideCtas}
										<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
									{:else}
										<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
									{/if}
								</button>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 {heroHideCtas ? 'opacity-50' : ''}">
								<div>
									<label for="hero-cta" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Primary CTA Label</label>
									<input
										id="hero-cta"
										type="text"
										bind:value={heroCta}
										class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs"
									/>
								</div>
								<div>
									<label for="hero-sec-cta" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Secondary CTA Label</label>
									<input
										id="hero-sec-cta"
										type="text"
										bind:value={heroSecondaryCta}
										class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs"
									/>
								</div>
							</div>
						</div>
					</div>
				</form>
			{/if}

			<!-- TAB 2: PROCESS FLOW & KEY POINTS -->
			{#if activeTab === 'process_flow'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-6">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value="process_flow" />
					<input type="hidden" name="contentJson" value={processContentJson} />

					<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
						<div>
							<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
								<CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> What is an ATM Account & Key Points
							</h3>
							<p class="text-xs text-slate-500 dark:text-slate-400">Configure title, description copy, key points cards, and the "Ready to Eliminate" CTA banner.</p>
						</div>

						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => (processHideSection = !processHideSection)}
								title={processHideSection ? 'Unhide Process Section' : 'Hide Process Section'}
								class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs {processHideSection ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
							>
								{#if processHideSection}
									<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
								{:else}
									<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
								{/if}
							</button>

							<button
								type="submit"
								disabled={isSavingSection}
								title={isSavingSection ? 'Saving...' : 'Save Changes'}
								aria-label={isSavingSection ? 'Saving...' : 'Save Changes'}
								class="btn-primary !p-2 rounded-xl flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if isSavingSection}
									<Loader2 class="w-4 h-4 animate-spin" />
								{:else}
									<Save class="w-4 h-4" />
								{/if}
							</button>
						</div>
					</div>

					<div class="space-y-4 text-xs">
						<div>
							<label for="pf-title" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Section Title *</label>
							<input
								id="pf-title"
								type="text"
								name="title"
								required
								bind:value={processTitle}
								class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs"
							/>
						</div>

						<div>
							<label for="pf-subtitle" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Description Paragraph Copy *</label>
							<textarea
								id="pf-subtitle"
								name="subtitle"
								rows="3"
								required
								bind:value={processSubtitle}
								class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs"
							></textarea>
						</div>

						<!-- Key Points Cards Editor -->
						<div class="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
							<div class="flex items-center justify-between">
								<h4 class="font-black text-sm text-slate-900 dark:text-slate-100">Key Points Advantage Cards</h4>

								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => (processHideKeyPoints = !processHideKeyPoints)}
										title={processHideKeyPoints ? 'Unhide Key Points Cards' : 'Hide Key Points Cards'}
										class="p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {processHideKeyPoints ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
									>
										{#if processHideKeyPoints}
											<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
										{:else}
											<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
										{/if}
									</button>

									<button type="button" onclick={addKeyPoint} class="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer">
										<Plus class="w-3.5 h-3.5" /> Add Card
									</button>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-3 gap-4 {processHideKeyPoints ? 'opacity-50 grayscale-[40%]' : ''}">
								{#each processKeyPoints as card, idx}
									<div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3 relative">
										<div class="flex items-center justify-between">
											<span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">Card #{idx + 1}</span>
											<button type="button" onclick={() => removeKeyPoint(idx)} class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
												<Trash2 class="w-3.5 h-3.5" />
											</button>
										</div>
										<input type="text" bind:value={card.badge} placeholder="Badge Text (e.g. Cash Reduction)" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
										<input type="text" bind:value={card.title} placeholder="Card Title" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
										<textarea rows="2" bind:value={card.desc} placeholder="Card description..." class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs"></textarea>
										<input type="text" bind:value={card.tag} placeholder="Bottom Tagline (e.g. Drastically reduces cash)" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold" />
									</div>
								{/each}
							</div>
						</div>

						<!-- Ready to Eliminate CTA Banner Editor -->
						<div class="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
							<div class="flex items-center justify-between">
								<h4 class="font-black text-sm text-slate-900 dark:text-slate-100">"Ready to Eliminate Credit Card Fees?" CTA Banner</h4>
								<button
									type="button"
									onclick={() => (processHideCtaBanner = !processHideCtaBanner)}
									title={processHideCtaBanner ? 'Unhide Banner' : 'Hide Banner'}
									class="p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {processHideCtaBanner ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
								>
									{#if processHideCtaBanner}
										<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
									{:else}
										<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
									{/if}
								</button>
							</div>

							<div class="space-y-3 {processHideCtaBanner ? 'opacity-50 grayscale-[40%]' : ''}">
								<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
									<input type="text" bind:value={processCtaBanner.title} placeholder="CTA Heading" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-bold" />
									<input type="text" bind:value={processCtaBanner.badge} placeholder="CTA Badge Text" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-bold" />
								</div>
								<textarea rows="2" bind:value={processCtaBanner.subtitle} placeholder="CTA Subtitle copy..." class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"></textarea>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<input type="text" bind:value={processCtaBanner.primaryCta} placeholder="Primary Button Label" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
									<input type="text" bind:value={processCtaBanner.secondaryCta} placeholder="Secondary Button Label" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
								</div>
							</div>
						</div>
					</div>
				</form>
			{/if}

			<!-- TAB 3: PRODUCT SHOWCASE & SERVICES -->
			{#if activeTab === 'how_it_works'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-6">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value="how_it_works" />
					<input type="hidden" name="contentJson" value={howContentJson} />

					<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
						<div>
							<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
								<Layers class="w-4 h-4 text-amber-600 dark:text-amber-400" /> Product Showcase & Services
							</h3>
							<p class="text-xs text-slate-500 dark:text-slate-400">Configure terminal feature cards, hardware upgrade CTA, and the Complete In-House Solutions checklist.</p>
						</div>

						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => (howHideSection = !howHideSection)}
								title={howHideSection ? 'Unhide Product Showcase Section' : 'Hide Product Showcase Section'}
								class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs {howHideSection ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
							>
								{#if howHideSection}
									<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
								{:else}
									<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
								{/if}
							</button>

							<button
								type="submit"
								disabled={isSavingSection}
								title={isSavingSection ? 'Saving...' : 'Save Changes'}
								aria-label={isSavingSection ? 'Saving...' : 'Save Changes'}
								class="btn-primary !p-2 rounded-xl flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if isSavingSection}
									<Loader2 class="w-4 h-4 animate-spin" />
								{:else}
									<Save class="w-4 h-4" />
								{/if}
							</button>
						</div>
					</div>

					<div class="space-y-4 text-xs">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div>
								<label for="how-title" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Section Title *</label>
								<input id="how-title" type="text" name="title" required bind:value={howTitle} class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
							</div>
							<div>
								<label for="how-subtitle" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Section Subtitle *</label>
								<input id="how-subtitle" type="text" name="subtitle" required bind:value={howSubtitle} class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
							</div>
						</div>

						<!-- Product Features Grid Editor with Hide/Unhide Toggle -->
						<div class="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
							<div class="flex items-center justify-between">
								<h4 class="font-black text-sm text-slate-900 dark:text-slate-100">Product Features Grid ({howFeatures.length} Items)</h4>

								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => (howHideFeaturesGrid = !howHideFeaturesGrid)}
										title={howHideFeaturesGrid ? 'Unhide Features Grid' : 'Hide Features Grid'}
										class="p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {howHideFeaturesGrid ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
									>
										{#if howHideFeaturesGrid}
											<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
										{:else}
											<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
										{/if}
									</button>

									<button type="button" onclick={addHowFeature} class="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer">
										<Plus class="w-3.5 h-3.5" /> Add Feature
									</button>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-3 gap-3 transition-all {howHideFeaturesGrid ? 'opacity-50 grayscale-[40%]' : ''}">
								{#each howFeatures as feat, idx}
									<div class="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2 relative">
										<div class="flex items-center justify-between">
											<span class="text-xs font-bold text-amber-600">Feature #{idx + 1}</span>
											<button type="button" onclick={() => removeHowFeature(idx)} class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
												<Trash2 class="w-3.5 h-3.5" />
											</button>
										</div>
										<input type="text" bind:value={feat.title} placeholder="Feature Title" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
										<textarea rows="2" bind:value={feat.desc} placeholder="Feature description..." class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs"></textarea>
									</div>
								{/each}
							</div>
						</div>

						<!-- Hardware Upgrade CTA Banner Editor with Hide/Unhide Toggle -->
						<div class="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
							<div class="flex items-center justify-between">
								<h4 class="font-black text-sm text-slate-900 dark:text-slate-100">"Ready to Upgrade Your Checkout Hardware?" CTA Banner</h4>
								<button
									type="button"
									onclick={() => (howHideHardwareCta = !howHideHardwareCta)}
									title={howHideHardwareCta ? 'Unhide CTA Banner' : 'Hide CTA Banner'}
									class="p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {howHideHardwareCta ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
								>
									{#if howHideHardwareCta}
										<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
									{:else}
										<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
									{/if}
								</button>
							</div>

							<div class="space-y-3 {howHideHardwareCta ? 'opacity-50 grayscale-[40%]' : ''}">
								<input type="text" bind:value={howHardwareCta.title} placeholder="Heading Title" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
								<textarea rows="2" bind:value={howHardwareCta.subtitle} placeholder="Subtitle description..." class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5"></textarea>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<input type="text" bind:value={howHardwareCta.primaryCta} placeholder="Primary Button Text" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
									<input type="text" bind:value={howHardwareCta.secondaryCta} placeholder="Secondary Button Text" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
								</div>
							</div>
						</div>

						<!-- Complete In-House ATM Solutions Checklist Editor with Hide/Unhide Toggle -->
						<div class="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
							<div class="flex items-center justify-between">
								<h4 class="font-black text-sm text-slate-900 dark:text-slate-100">Complete In-House ATM Solutions Checklist</h4>

								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => (howHideServicesSection = !howHideServicesSection)}
										title={howHideServicesSection ? 'Unhide Checklist Section' : 'Hide Checklist Section'}
										class="p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {howHideServicesSection ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
									>
										{#if howHideServicesSection}
											<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
										{:else}
											<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
										{/if}
									</button>

									<button type="button" onclick={addChecklistItem} class="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer">
										<Plus class="w-3.5 h-3.5" /> Add Checklist Item
									</button>
								</div>
							</div>

							<div class="space-y-3 {howHideServicesSection ? 'opacity-50 grayscale-[40%]' : ''}">
								<input type="text" bind:value={howServicesSection.title} placeholder="Solutions Title" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
								<textarea rows="2" bind:value={howServicesSection.subtitle1} placeholder="Paragraph 1..." class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5"></textarea>
								<textarea rows="2" bind:value={howServicesSection.subtitle2} placeholder="Paragraph 2..." class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5"></textarea>

								<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
									{#each howServicesSection.checklist as item, idx}
										<div class="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
											<input type="text" bind:value={howServicesSection.checklist[idx]} class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md p-1.5 text-xs font-bold" />
											<button type="button" onclick={() => removeChecklistItem(idx)} class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
												<Trash2 class="w-3.5 h-3.5" />
											</button>
										</div>
									{/each}
								</div>
							</div>
						</div>
					</div>
				</form>
			{/if}

			<!-- TAB 4: ABOUT SECTION -->
			{#if activeTab === 'about'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-5">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value="about" />
					<input type="hidden" name="contentJson" value={aboutContentJson} />

					<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
						<div>
							<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
								<Info class="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> High-Risk Business Categories Section
							</h3>
							<p class="text-xs text-slate-500 dark:text-slate-400">Configure high-risk industry guidelines, processor criteria, and support notices.</p>
						</div>

						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => (aboutHideSection = !aboutHideSection)}
								title={aboutHideSection ? 'Unhide About Section' : 'Hide About Section'}
								class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs {aboutHideSection ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
							>
								{#if aboutHideSection}
									<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
								{:else}
									<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
								{/if}
							</button>

							<button
								type="submit"
								disabled={isSavingSection}
								title={isSavingSection ? 'Saving...' : 'Save Changes'}
								aria-label={isSavingSection ? 'Saving...' : 'Save Changes'}
								class="btn-primary !p-2 rounded-xl flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if isSavingSection}
									<Loader2 class="w-4 h-4 animate-spin" />
								{:else}
									<Save class="w-4 h-4" />
								{/if}
							</button>
						</div>
					</div>

					<div class="space-y-4 text-xs">
						<div>
							<label for="about-title" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Section Title *</label>
							<input id="about-title" type="text" name="title" required bind:value={aboutTitle} class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
						</div>

						<div class="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
							<div class="flex items-center justify-between">
								<label for="about-desc" class="font-bold text-slate-800 dark:text-slate-300 block">Description Copy *</label>
								<button
									type="button"
									onclick={() => (aboutHideDescription = !aboutHideDescription)}
									title={aboutHideDescription ? 'Unhide Description Copy' : 'Hide Description Copy'}
									class="p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {aboutHideDescription ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
								>
									{#if aboutHideDescription}
										<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
									{:else}
										<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
									{/if}
								</button>
							</div>
							<textarea id="about-desc" rows="6" bind:value={aboutDescription} class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs leading-relaxed {aboutHideDescription ? 'opacity-50' : ''}"></textarea>
						</div>

						<div class="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
							<div class="flex items-center justify-between">
								<label for="about-notice" class="font-bold text-slate-800 dark:text-slate-300 block">Transition Notice / FAQ Lead-In Text</label>
								<button
									type="button"
									onclick={() => (aboutHideNotice = !aboutHideNotice)}
									title={aboutHideNotice ? 'Unhide Notice' : 'Hide Notice'}
									class="p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {aboutHideNotice ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
								>
									{#if aboutHideNotice}
										<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
									{:else}
										<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
									{/if}
								</button>
							</div>
							<input id="about-notice" type="text" bind:value={aboutNotice} class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold {aboutHideNotice ? 'opacity-50' : ''}" />
						</div>
					</div>
				</form>
			{/if}

			<!-- TAB 5: CONTACT & SUPPORT SECTION -->
			{#if activeTab === 'contact'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-5">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value="contact" />
					<input type="hidden" name="contentJson" value={contactContentJson} />

					<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
						<div>
							<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
								<Phone class="w-4 h-4 text-purple-600 dark:text-purple-400" /> Support & Contact Details Section
							</h3>
							<p class="text-xs text-slate-500 dark:text-slate-400">Configure phone, email, and business support hours displayed at the bottom of the intake page.</p>
						</div>

						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => (contactHideSection = !contactHideSection)}
								title={contactHideSection ? 'Unhide Contact Section' : 'Hide Contact Section'}
								class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs {contactHideSection ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
							>
								{#if contactHideSection}
									<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
								{:else}
									<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
								{/if}
							</button>

							<button
								type="submit"
								disabled={isSavingSection}
								title={isSavingSection ? 'Saving...' : 'Save Changes'}
								aria-label={isSavingSection ? 'Saving...' : 'Save Changes'}
								class="btn-primary !p-2 rounded-xl flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if isSavingSection}
									<Loader2 class="w-4 h-4 animate-spin" />
								{:else}
									<Save class="w-4 h-4" />
								{/if}
							</button>
						</div>
					</div>

					<div class="space-y-4 text-xs">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div>
								<label for="contact-title" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Section Title *</label>
								<input id="contact-title" type="text" name="title" required bind:value={contactTitle} class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
							</div>
							<div>
								<label for="contact-subtitle" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Section Subtitle *</label>
								<input id="contact-subtitle" type="text" name="subtitle" required bind:value={contactSubtitle} class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
							<div class="space-y-1">
								<div class="flex items-center justify-between">
									<label for="contact-email" class="font-bold text-slate-800 dark:text-slate-300 block">Support Email</label>
									<button
										type="button"
										onclick={() => (contactHideEmail = !contactHideEmail)}
										title={contactHideEmail ? 'Unhide Support Email' : 'Hide Support Email'}
										class="p-1 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {contactHideEmail ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
									>
										{#if contactHideEmail}
											<EyeOff class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
										{:else}
											<Eye class="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
										{/if}
									</button>
								</div>
								<input id="contact-email" type="email" bind:value={contactEmail} placeholder="sales@nbmsinc.com" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold {contactHideEmail ? 'opacity-50' : ''}" />
							</div>

							<div class="space-y-1">
								<div class="flex items-center justify-between">
									<label for="contact-phone" class="font-bold text-slate-800 dark:text-slate-300 block">Support Phone</label>
									<button
										type="button"
										onclick={() => (contactHidePhone = !contactHidePhone)}
										title={contactHidePhone ? 'Unhide Support Phone' : 'Hide Support Phone'}
										class="p-1 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {contactHidePhone ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
									>
										{#if contactHidePhone}
											<EyeOff class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
										{:else}
											<Eye class="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
										{/if}
									</button>
								</div>
								<input id="contact-phone" type="text" bind:value={contactPhone} placeholder="+1 (800) 555-PAYJ" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold {contactHidePhone ? 'opacity-50' : ''}" />
							</div>

							<div class="space-y-1">
								<div class="flex items-center justify-between">
									<label for="contact-hours" class="font-bold text-slate-800 dark:text-slate-300 block">Operating Hours</label>
									<button
										type="button"
										onclick={() => (contactHideHours = !contactHideHours)}
										title={contactHideHours ? 'Unhide Operating Hours' : 'Hide Operating Hours'}
										class="p-1 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {contactHideHours ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
									>
										{#if contactHideHours}
											<EyeOff class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
										{:else}
											<Eye class="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
										{/if}
									</button>
								</div>
								<input id="contact-hours" type="text" bind:value={contactHours} placeholder="Mon - Sun: 24/7 Priority Desk" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold {contactHideHours ? 'opacity-50' : ''}" />
							</div>
						</div>

						<div class="space-y-1">
							<div class="flex items-center justify-between">
								<label for="contact-notice" class="font-bold text-slate-800 dark:text-slate-300 block">Help / Notice Banner Text</label>
								<button
									type="button"
									onclick={() => (contactHideNotice = !contactHideNotice)}
									title={contactHideNotice ? 'Unhide Notice Banner' : 'Hide Notice Banner'}
									class="p-1 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {contactHideNotice ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
								>
									{#if contactHideNotice}
										<EyeOff class="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
									{:else}
										<Eye class="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
									{/if}
								</button>
							</div>
							<textarea id="contact-notice" rows="2" bind:value={contactNotice} placeholder="Questions about processing rates..." class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 {contactHideNotice ? 'opacity-50' : ''}"></textarea>
						</div>
					</div>
				</form>
			{/if}

			<!-- TAB 6: FAQS ACCORDION -->
			{#if activeTab === 'faqs'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-6">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value="faqs" />
					<input type="hidden" name="contentJson" value={faqsContentJson} />

					<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
						<div>
							<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
								<HelpCircle class="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Frequently Asked Questions Manager
							</h3>
							<p class="text-xs text-slate-500 dark:text-slate-400">Add, edit, remove, and manage FAQ question and answer items on the public intake funnel.</p>
						</div>

						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => (faqsHideSection = !faqsHideSection)}
								title={faqsHideSection ? 'Unhide FAQs Section' : 'Hide FAQs Section'}
								class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs {faqsHideSection ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
							>
								{#if faqsHideSection}
									<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
								{:else}
									<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
								{/if}
							</button>

							<button
								type="submit"
								disabled={isSavingSection}
								title={isSavingSection ? 'Saving...' : 'Save Changes'}
								aria-label={isSavingSection ? 'Saving...' : 'Save Changes'}
								class="btn-primary !p-2 rounded-xl flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if isSavingSection}
									<Loader2 class="w-4 h-4 animate-spin" />
								{:else}
									<Save class="w-4 h-4" />
								{/if}
							</button>
						</div>
					</div>

					<div class="space-y-4 text-xs">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div>
								<label for="faq-title" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">FAQ Section Title *</label>
								<input id="faq-title" type="text" name="title" required bind:value={faqsTitle} class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
							</div>
							<div>
								<label for="faq-subtitle" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">FAQ Section Subtitle *</label>
								<input id="faq-subtitle" type="text" name="subtitle" required bind:value={faqsSubtitle} class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
							</div>
						</div>

						<div class="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
							<div class="flex items-center justify-between">
								<h4 class="font-black text-sm text-slate-900 dark:text-slate-100">FAQ Items ({faqItems.length} Questions)</h4>

								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => (faqsHideFaqItems = !faqsHideFaqItems)}
										title={faqsHideFaqItems ? 'Unhide FAQ Accordion' : 'Hide FAQ Accordion'}
										class="p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {faqsHideFaqItems ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
									>
										{#if faqsHideFaqItems}
											<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
										{:else}
											<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
										{/if}
									</button>

									<button type="button" onclick={addFaqItem} class="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer">
										<Plus class="w-3.5 h-3.5" /> Add FAQ Item
									</button>
								</div>
							</div>

							<div class="space-y-3 {faqsHideFaqItems ? 'opacity-50 grayscale-[40%]' : ''}">
								{#each faqItems as item, idx}
									<div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2 relative">
										<div class="flex items-center justify-between">
											<span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">Question #{idx + 1}</span>
											<button type="button" onclick={() => removeFaqItem(idx)} class="text-rose-500 hover:text-rose-700 p-1 cursor-pointer">
												<Trash2 class="w-3.5 h-3.5" />
											</button>
										</div>
										<input type="text" bind:value={item.question} placeholder="Question..." class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs font-bold" />
										<textarea rows="3" bind:value={item.answer} placeholder="Answer description..." class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs leading-relaxed"></textarea>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</form>
			{/if}

			<!-- TAB 7: FOOTER & FINAL CTA -->
			{#if activeTab === 'footer'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-5">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value="footer" />
					<input type="hidden" name="contentJson" value={footerContentJson} />

					<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
						<div>
							<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
								<ExternalLink class="w-4 h-4 text-rose-600 dark:text-rose-400" /> Footer CTA Banner & Copyright Bar
							</h3>
							<p class="text-xs text-slate-500 dark:text-slate-400">Configure the bottom "Ready to Get Started" banner, CTA labels, and footer copyright text.</p>
						</div>

						<div class="flex items-center gap-2">
							<button
								type="button"
								onclick={() => (footerHideSection = !footerHideSection)}
								title={footerHideSection ? 'Unhide Footer Section' : 'Hide Footer Section'}
								class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs {footerHideSection ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
							>
								{#if footerHideSection}
									<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
								{:else}
									<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
								{/if}
							</button>

							<button
								type="submit"
								disabled={isSavingSection}
								title={isSavingSection ? 'Saving...' : 'Save Changes'}
								aria-label={isSavingSection ? 'Saving...' : 'Save Changes'}
								class="btn-primary !p-2 rounded-xl flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if isSavingSection}
									<Loader2 class="w-4 h-4 animate-spin" />
								{:else}
									<Save class="w-4 h-4" />
								{/if}
							</button>
						</div>
					</div>

					<div class="space-y-4 text-xs">
						<div class="space-y-3">
							<div class="flex items-center justify-between">
								<h4 class="font-black text-sm text-slate-900 dark:text-slate-100">"Ready to Get Started with NBMS?" Footer Banner</h4>
								<button
									type="button"
									onclick={() => (footerHideCtaBanner = !footerHideCtaBanner)}
									title={footerHideCtaBanner ? 'Unhide Footer Banner' : 'Hide Footer Banner'}
									class="p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {footerHideCtaBanner ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
								>
									{#if footerHideCtaBanner}
										<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
									{:else}
										<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
									{/if}
								</button>
							</div>

							<div class="space-y-3 {footerHideCtaBanner ? 'opacity-50 grayscale-[40%]' : ''}">
								<input type="text" bind:value={footerCtaBanner.title} placeholder="Banner Heading" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
								<textarea rows="2" bind:value={footerCtaBanner.subtitle} placeholder="Banner subtitle copy..." class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5"></textarea>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<input type="text" bind:value={footerCtaBanner.primaryCta} placeholder="Primary Button Text" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
									<input type="text" bind:value={footerCtaBanner.secondaryCta} placeholder="Secondary Button Text" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
								</div>
							</div>
						</div>

						<div class="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
							<label for="footer-copyright" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Footer Copyright Line</label>
							<input id="footer-copyright" type="text" bind:value={footerCopyright} placeholder="© 2026 NBMS INC. All rights reserved." class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold" />
						</div>
					</div>
				</form>
			{/if}
		</div>
	</div>
</div>

<!-- Reorder Funnel Sections Modal -->
{#if isReorderModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
		<div class="glass-panel w-full max-w-lg rounded-2xl border border-slate-200 dark:border-purple-500/30 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-2xl relative">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20 flex items-center justify-center shadow-xs">
						<ArrowUpDown class="w-5 h-5" />
					</div>
					<div>
						<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">Reorder Funnel Sections</h3>
						<p class="text-xs text-slate-600 dark:text-slate-400">Drag items or use buttons to rearrange live page layout</p>
					</div>
				</div>
				<button
					onclick={() => (isReorderModalOpen = false)}
					class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
				>
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Reorderable List -->
			<div class="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
				{#each sectionOrder as secId, idx}
					{@const meta = sectionMeta[secId as SectionId]}
					{#if meta}
						<div
							role="listitem"
							draggable="true"
							ondragstart={(e) => handleDragStart(e, idx)}
							ondragover={(e) => handleDragOver(e, idx)}
							ondragleave={handleDragLeave}
							ondrop={(e) => handleDrop(e, idx)}
							ondragend={handleDragEnd}
							class="group flex items-center justify-between p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing shadow-xs select-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/40 {draggedIndex === idx ? 'opacity-40 scale-95 border-dashed border-purple-500' : ''} {dragOverIndex === idx ? 'ring-2 ring-purple-500 scale-105' : ''}"
						>
							<div class="flex items-center gap-3 min-w-0">
								<GripVertical class="w-4 h-4 text-slate-400 group-hover:text-purple-600 dark:text-slate-600 dark:group-hover:text-purple-400 transition-colors flex-shrink-0" />
								<div class="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300 flex-shrink-0">
									#{idx + 1}
								</div>
								<div class="flex items-center gap-2 min-w-0">
									<meta.icon class="w-4 h-4 {meta.colorClass} flex-shrink-0" />
									<span class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{meta.name}</span>
								</div>
							</div>

							<div class="flex items-center gap-1 flex-shrink-0">
								{#if idx > 0}
									<button
										type="button"
										onclick={() => moveSection(idx, idx - 1)}
										title="Move Up"
										class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/40 text-slate-600 hover:text-purple-700 dark:text-slate-400 dark:hover:text-purple-300 cursor-pointer"
									>
										<ChevronUp class="w-4 h-4" />
									</button>
								{/if}
								{#if idx < sectionOrder.length - 1}
									<button
										type="button"
										onclick={() => moveSection(idx, idx + 1)}
										title="Move Down"
										class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/40 text-slate-600 hover:text-purple-700 dark:text-slate-400 dark:hover:text-purple-300 cursor-pointer"
									>
										<ChevronDown class="w-4 h-4" />
									</button>
								{/if}
							</div>
						</div>
					{/if}
				{/each}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
				{#if orderSavedToast}
					<span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
						<CheckCircle2 class="w-4 h-4" /> Layout saved live!
					</span>
				{:else}
					<span class="text-xs text-slate-500 dark:text-slate-400 font-medium">Order updates live on public funnel</span>
				{/if}

				<button
					onclick={() => (isReorderModalOpen = false)}
					class="btn-primary text-xs cursor-pointer"
				>
					Done Reordering
				</button>
			</div>
		</div>
	</div>
{/if}
