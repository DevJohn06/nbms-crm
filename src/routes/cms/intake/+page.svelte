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
		Copy,
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

	type TemplateType = 'hero' | 'about' | 'how_it_works' | 'process_flow' | 'contact' | 'faqs' | 'footer';

	const templateMeta: Record<TemplateType, { defaultName: string; icon: any; colorClass: string }> = {
		hero: { defaultName: 'Hero Section', icon: Sparkles, colorClass: 'text-[#1f71c1] dark:text-sky-400' },
		process_flow: { defaultName: 'Process Flow & Key Points', icon: CheckCircle2, colorClass: 'text-emerald-600 dark:text-emerald-400' },
		how_it_works: { defaultName: 'Product Showcase & Services', icon: Layers, colorClass: 'text-amber-600 dark:text-amber-400' },
		about: { defaultName: 'About Section', icon: Info, colorClass: 'text-cyan-600 dark:text-cyan-400' },
		contact: { defaultName: 'Contact & Support', icon: Phone, colorClass: 'text-purple-600 dark:text-purple-400' },
		faqs: { defaultName: 'FAQs Accordion', icon: HelpCircle, colorClass: 'text-indigo-600 dark:text-indigo-400' },
		footer: { defaultName: 'Footer & Final CTA', icon: ExternalLink, colorClass: 'text-rose-600 dark:text-rose-400' }
	};

	let sectionOrder = $state<string[]>(['hero', 'process_flow', 'how_it_works', 'about', 'contact', 'faqs', 'footer']);
	let activeTab = $state<string>('hero');

	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	let isSavingOrder = $state(false);
	let isSavingSection = $state(false);
	let isDuplicating = $state(false);
	let isDeleting = $state(false);
	let orderSavedToast = $state(false);
	let isReorderModalOpen = $state(false);

	$effect(() => {
		if (data.sectionOrder && Array.isArray(data.sectionOrder) && data.sectionOrder.length > 0) {
			untrack(() => {
				sectionOrder = data.sectionOrder;
				if (!sectionOrder.includes(activeTab)) {
					activeTab = sectionOrder[0] || 'hero';
				}
			});
		}
	});

	function getSectionMeta(secId: string) {
		const sec = data.sections?.[secId];
		const tType: TemplateType = (
			sec?.content?.templateType || (
				secId.startsWith('hero') ? 'hero' :
				secId.startsWith('process_flow') ? 'process_flow' :
				secId.startsWith('how_it_works') ? 'how_it_works' :
				secId.startsWith('about') ? 'about' :
				secId.startsWith('contact') ? 'contact' :
				secId.startsWith('faqs') ? 'faqs' :
				secId.startsWith('footer') ? 'footer' : 'about'
			)
		);
		const meta = templateMeta[tType] || templateMeta.about;
		const name = sec?.content?.sectionName || sec?.title || meta.defaultName;
		const isDuplicate = !['hero', 'process_flow', 'how_it_works', 'about', 'contact', 'faqs', 'footer'].includes(secId);
		return {
			secId,
			templateType: tType,
			name,
			icon: meta.icon,
			colorClass: meta.colorClass,
			defaultName: meta.defaultName,
			isDuplicate
		};
	}

	let currentMeta = $derived(getSectionMeta(activeTab));

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

	async function duplicateSectionAction(secId: string, event?: Event) {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}
		isDuplicating = true;
		const formData = new FormData();
		formData.append('verticalId', data.activeVerticalId || '');
		formData.append('sectionId', secId);

		try {
			const res = await fetch('?/duplicateSection', {
				method: 'POST',
				body: formData
			});
			const result = await res.json().catch(() => null);
			if (res.ok && result?.type !== 'failure') {
				toastStore.success('Section Duplicated', 'New section copy created successfully.');
				window.location.reload();
			} else {
				const errMsg = result?.data?.error || 'Failed to duplicate section.';
				toastStore.error('Duplication Failed', String(errMsg));
			}
		} catch (e) {
			toastStore.error('Duplication Failed', 'An unexpected error occurred.');
		} finally {
			isDuplicating = false;
		}
	}

	async function deleteSectionAction(secId: string, event?: Event) {
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}
		const meta = getSectionMeta(secId);
		if (!confirm(`Are you sure you want to delete "${meta.name}"?`)) return;

		isDeleting = true;
		const formData = new FormData();
		formData.append('verticalId', data.activeVerticalId || '');
		formData.append('sectionId', secId);

		try {
			const res = await fetch('?/deleteSection', {
				method: 'POST',
				body: formData
			});
			const result = await res.json().catch(() => null);
			if (res.ok && result?.type !== 'failure') {
				toastStore.success('Section Deleted', 'Section removed from layout.');
				activeTab = 'hero';
				window.location.reload();
			} else {
				const errMsg = result?.data?.error || 'Could not delete section.';
				toastStore.error('Delete Failed', String(errMsg));
			}
		} catch (e) {
			toastStore.error('Delete Failed', 'An unexpected error occurred.');
		} finally {
			isDeleting = false;
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

	// Dynamic reactive state for current active section editor
	let activeSectionName = $state('');
	let activeTemplateType = $state<TemplateType>('hero');

	// Hero Section State
	let heroTitle = $state('');
	let heroSubtitle = $state('');
	let heroBadge = $state('');
	let heroTagline = $state('');
	let heroCta = $state('');
	let heroSecondaryCta = $state('');
	let heroBgImage = $state('');
	let heroBadges = $state<string[]>(['PCI Compliance', 'No Credit Check', '24 Hr Settlement']);
	let heroHideBadge = $state(false);
	let heroHideBadges = $state(false);
	let heroHideCtas = $state(false);
	let heroHideSection = $state(false);

	// Process Flow State
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

	// Product Showcase State
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

	// About Section State
	let aboutTitle = $state('');
	let aboutSubtitle = $state('');
	let aboutDescription = $state('');
	let aboutNotice = $state('');
	let aboutFeatures = $state<Array<{ title: string; desc: string }>>([]);
	let aboutHideDescription = $state(false);
	let aboutHideNotice = $state(false);
	let aboutHideSection = $state(false);

	// Contact Section State
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

	// FAQs Section State
	let faqsTitle = $state('');
	let faqsSubtitle = $state('');
	let faqItems = $state<Array<{ question: string; answer: string }>>([]);
	let faqsHideFaqItems = $state(false);
	let faqsHideSection = $state(false);

	// Footer Section State
	let footerCtaBanner = $state({
		title: 'Ready to Get Started with NBMS?',
		subtitle: 'Start processing cashless Pin Debit payments with zero merchant fees and daily direct bank deposits.',
		primaryCta: 'Get Info',
		secondaryCta: 'Book A Call'
	});
	let footerCopyright = $state('');
	let footerHideCtaBanner = $state(false);
	let footerHideSection = $state(false);

	// Populate form inputs when activeTab or data changes
	$effect(() => {
		if (data.sections && activeTab) {
			const currentSec = data.sections[activeTab];
			const meta = getSectionMeta(activeTab);

			untrack(() => {
				activeTemplateType = meta.templateType;
				activeSectionName = currentSec?.content?.sectionName || currentSec?.title || meta.name;

				if (meta.templateType === 'hero') {
					heroTitle = currentSec?.title || 'ATM Payment Processing Solutions';
					heroSubtitle = currentSec?.subtitle || 'Apply Today, Be In Business Tomorrow!';
					heroBadge = currentSec?.content?.badge || 'ATM Payment Processing Solutions';
					heroTagline = currentSec?.content?.tagline || 'THEY DECLINE. WE APPROVE.';
					heroCta = currentSec?.content?.primaryCta || 'Get Info';
					heroSecondaryCta = currentSec?.content?.secondaryCta || 'Book A Call';
					heroBgImage = currentSec?.content?.bgImage || currentSec?.content?.backgroundImage || '/images/tribal_hero_bg.jpg';
					if (currentSec?.content?.badges && Array.isArray(currentSec.content.badges)) {
						heroBadges = currentSec.content.badges.map((b: any) => typeof b === 'string' ? b : b.title || b.name || String(b));
					} else {
						heroBadges = ['PCI Compliance', 'No Credit Check', '24 Hr Settlement'];
					}
					heroHideBadge = !!currentSec?.content?.hideBadge;
					heroHideBadges = !!currentSec?.content?.hideBadges;
					heroHideCtas = !!currentSec?.content?.hideCtas;
					heroHideSection = !!currentSec?.content?.hideSection;
				} else if (meta.templateType === 'process_flow') {
					processTitle = currentSec?.title || 'What is an ATM Merchant Account?';
					processSubtitle = currentSec?.subtitle || '';
					processPrimaryCta = currentSec?.content?.primaryCta || 'Get Info';
					processSecondaryCta = currentSec?.content?.secondaryCta || 'Book A Call';
					if (currentSec?.content?.keyPoints && Array.isArray(currentSec.content.keyPoints)) {
						processKeyPoints = currentSec.content.keyPoints;
					}
					if (currentSec?.content?.ctaBanner) {
						processCtaBanner = { ...currentSec.content.ctaBanner };
					}
					processHideKeyPoints = !!currentSec?.content?.hideKeyPoints;
					processHideCtaBanner = !!currentSec?.content?.hideCtaBanner;
					processHideSection = !!currentSec?.content?.hideSection;
				} else if (meta.templateType === 'how_it_works') {
					howTitle = currentSec?.title || 'NBMS Pin Debit Cashless ATM Terminals';
					howSubtitle = currentSec?.subtitle || '';
					if (currentSec?.content?.features && Array.isArray(currentSec.content.features)) {
						howFeatures = currentSec.content.features;
					}
					if (currentSec?.content?.hardwareCta) {
						howHardwareCta = { ...currentSec.content.hardwareCta };
					}
					if (currentSec?.content?.servicesSection) {
						howServicesSection = { ...currentSec.content.servicesSection };
					}
					howHideFeaturesGrid = !!currentSec?.content?.hideFeaturesGrid;
					howHideHardwareCta = !!currentSec?.content?.hideHardwareCta;
					howHideServicesSection = !!currentSec?.content?.hideServicesSection;
					howHideSection = !!currentSec?.content?.hideSection;
				} else if (meta.templateType === 'about') {
					aboutTitle = currentSec?.title || 'High-Risk Business Categories';
					aboutSubtitle = currentSec?.subtitle || '';
					aboutDescription = currentSec?.content?.description || '';
					aboutNotice = currentSec?.content?.transitionNotice || '';
					if (currentSec?.content?.features && Array.isArray(currentSec.content.features)) {
						aboutFeatures = currentSec.content.features;
					}
					aboutHideDescription = !!currentSec?.content?.hideDescription;
					aboutHideNotice = !!currentSec?.content?.hideNotice;
					aboutHideSection = !!currentSec?.content?.hideSection;
				} else if (meta.templateType === 'contact') {
					contactTitle = currentSec?.title || 'Merchant Support & Priority Assistance';
					contactSubtitle = currentSec?.subtitle || '';
					contactEmail = currentSec?.content?.email || '';
					contactPhone = currentSec?.content?.phone || '';
					contactHours = currentSec?.content?.hours || '';
					contactNotice = currentSec?.content?.helpNotice || '';
					contactHidePhone = !!currentSec?.content?.hidePhone;
					contactHideEmail = !!currentSec?.content?.hideEmail;
					contactHideHours = !!currentSec?.content?.hideHours;
					contactHideNotice = !!currentSec?.content?.hideNotice;
					contactHideSection = !!currentSec?.content?.hideSection;
				} else if (meta.templateType === 'faqs') {
					faqsTitle = currentSec?.title || 'Frequently Asked Questions';
					faqsSubtitle = currentSec?.subtitle || '';
					if (currentSec?.content?.items && Array.isArray(currentSec.content.items)) {
						faqItems = currentSec.content.items;
					}
					faqsHideFaqItems = !!currentSec?.content?.hideFaqItems;
					faqsHideSection = !!currentSec?.content?.hideSection;
				} else if (meta.templateType === 'footer') {
					if (currentSec?.content?.ctaBanner) {
						footerCtaBanner = { ...currentSec.content.ctaBanner };
					}
					footerCopyright = currentSec?.content?.copyright || '© 2026 NBMS INC. All rights reserved.';
					footerHideCtaBanner = !!currentSec?.content?.hideCtaBanner;
					footerHideSection = !!currentSec?.content?.hideSection;
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

	function addHeroBadge() {
		heroBadges = [...heroBadges, 'New Feature Badge'];
	}

	function removeHeroBadge(idx: number) {
		heroBadges = heroBadges.filter((_, i) => i !== idx);
	}

	let heroContentJson = $derived(
		JSON.stringify({
			templateType: 'hero',
			sectionName: activeSectionName,
			badge: heroBadge,
			tagline: heroTagline,
			primaryCta: heroCta,
			secondaryCta: heroSecondaryCta,
			bgImage: heroBgImage,
			badges: heroBadges,
			hideBadge: heroHideBadge,
			hideBadges: heroHideBadges,
			hideCtas: heroHideCtas,
			hideSection: heroHideSection
		})
	);

	let processContentJson = $derived(
		JSON.stringify({
			templateType: 'process_flow',
			sectionName: activeSectionName,
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
			templateType: 'how_it_works',
			sectionName: activeSectionName,
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
			templateType: 'about',
			sectionName: activeSectionName,
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
			templateType: 'contact',
			sectionName: activeSectionName,
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
			templateType: 'faqs',
			sectionName: activeSectionName,
			items: faqItems,
			hideFaqItems: faqsHideFaqItems,
			hideSection: faqsHideSection
		})
	);

	let footerContentJson = $derived(
		JSON.stringify({
			templateType: 'footer',
			sectionName: activeSectionName,
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
				Customize dynamic content sections, duplicate templates, rename sections, and reorder layout displayed on the public merchant intake portal for <strong class="text-purple-700 dark:text-purple-300">{data.verticalName}</strong>.
			</p>
		</div>

		<div class="flex items-center gap-2 shrink-0 flex-nowrap">
			{#if data.allVerticals && data.allVerticals.length > 0}
				<div class="flex items-center gap-2 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 rounded-xl px-3 h-9 shadow-2xs">
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
				class="btn-secondary h-9 w-9 !p-0 inline-flex items-center justify-center shrink-0 shadow-xs cursor-pointer rounded-xl"
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

			<!-- Dynamic Section Navigation Sidebar -->
			<div class="glass-panel p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs space-y-1 max-h-[70vh] overflow-y-auto">
				<div class="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
					<span>Page Sections ({sectionOrder.length})</span>
					<span class="text-[10px] font-medium text-slate-400">Click to edit</span>
				</div>

				{#each sectionOrder as secId, idx}
					{@const meta = getSectionMeta(secId)}
					<button
						type="button"
						onclick={() => (activeTab = secId)}
						class="w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 border shadow-xs relative overflow-hidden group {activeTab === secId ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-950 dark:text-purple-100 border-purple-300 dark:border-purple-500/60 font-bold shadow-sm' : 'bg-transparent text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-800'}"
					>
						{#if activeTab === secId}
							<div class="absolute left-0 top-0 bottom-0 w-1 bg-purple-600 dark:bg-purple-400 rounded-r"></div>
						{/if}

						<div class="flex items-center gap-3 min-w-0">
							<div class="min-w-0">
								<p class="text-xs font-extrabold truncate">{idx + 1}. {meta.name}</p>
								<div class="flex items-center gap-1.5 mt-0.5">
									<span class="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
										{meta.templateType}
									</span>
									{#if meta.isDuplicate}
										<span class="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
											Copy
										</span>
									{/if}
								</div>
							</div>
						</div>

						<ChevronRight class="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
					</button>
				{/each}
			</div>
		</div>

		<!-- Right Main Content Editor Panel -->
		<div class="lg:col-span-8 xl:col-span-9 space-y-6">
			<!-- TAB TEMPLATE 1: HERO SECTION -->
			{#if currentMeta.templateType === 'hero'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-5">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value={activeTab} />
					<input type="hidden" name="contentJson" value={heroContentJson} />

					<!-- Header bar with Title, Rename, Duplicate, Delete & Save -->
					<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
						<div>
							<div class="flex items-center gap-2">
								<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
									<Sparkles class="w-4 h-4 text-purple-600 dark:text-purple-400" /> {currentMeta.name}
								</h3>
								<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-300">
									Template: Hero
								</span>
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Main headline, subheadline, tagline, and CTA labels.</p>
						</div>

						<div class="flex items-center gap-2 self-end sm:self-auto">
							<button
								type="button"
								onclick={(e) => duplicateSectionAction(activeTab, e)}
								disabled={isDuplicating}
								title="Duplicate this section"
								class="btn-secondary !p-2 text-xs flex items-center gap-1.5 cursor-pointer"
							>
								<Copy class="w-4 h-4 text-purple-600 dark:text-purple-400" />
								<span class="hidden sm:inline">Duplicate</span>
							</button>

							{#if currentMeta.isDuplicate}
								<button
									type="button"
									onclick={(e) => deleteSectionAction(activeTab, e)}
									disabled={isDeleting}
									title="Delete duplicated section"
									class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							{/if}

							<button
								type="button"
								onclick={() => (heroHideSection = !heroHideSection)}
								title={heroHideSection ? 'Unhide Section' : 'Hide Section'}
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
						<!-- Editable Section Display Name -->
						<div class="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/30">
							<label for="hero-sec-name" class="font-bold text-purple-950 dark:text-purple-200 block mb-1">Section Display Name (CMS Label & Admin Sidebar)</label>
							<input
								id="hero-sec-name"
								type="text"
								bind:value={activeSectionName}
								required
								placeholder="Hero Section Name"
								class="w-full bg-white dark:bg-slate-950 border border-purple-300 dark:border-purple-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-bold focus:border-purple-600 shadow-xs"
							/>
						</div>

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

						<div>
							<label for="hero-bg-image" class="font-bold text-slate-800 dark:text-slate-300 block mb-1">Hero Background Image Path / URL</label>
							<input
								id="hero-bg-image"
								type="text"
								bind:value={heroBgImage}
								placeholder="/images/tribal_hero_bg.jpg"
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

						<div class="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
							<div class="flex items-center justify-between">
								<div>
									<h4 class="font-black text-xs text-slate-800 dark:text-slate-300 uppercase tracking-wider">Hero Feature Badges (3 Bottom Pills)</h4>
									<p class="text-[11px] text-slate-500 dark:text-slate-400">Dynamic feature labels displayed at the bottom of the hero section.</p>
								</div>
								<div class="flex items-center gap-2">
									<button
										type="button"
										onclick={() => (heroHideBadges = !heroHideBadges)}
										title={heroHideBadges ? 'Unhide Feature Badges' : 'Hide Feature Badges'}
										class="p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer shadow-xs {heroHideBadges ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'}"
									>
										{#if heroHideBadges}
											<EyeOff class="w-4 h-4 text-rose-600 dark:text-rose-400" />
										{:else}
											<Eye class="w-4 h-4 text-slate-600 dark:text-slate-300" />
										{/if}
									</button>
									<button
										type="button"
										onclick={addHeroBadge}
										class="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800 hover:bg-purple-200 flex items-center gap-1 cursor-pointer"
									>
										<Plus class="w-3.5 h-3.5" />
										<span>Add Badge</span>
									</button>
								</div>
							</div>

							<div class="space-y-2 {heroHideBadges ? 'opacity-50' : ''}">
								{#each heroBadges as badge, idx}
									<div class="flex items-center gap-2">
										<input
											type="text"
											bind:value={heroBadges[idx]}
											placeholder="Feature badge label..."
											class="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 shadow-xs"
										/>
										<button
											type="button"
											onclick={() => removeHeroBadge(idx)}
											class="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-800 cursor-pointer"
										>
											<Trash2 class="w-4 h-4" />
										</button>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</form>
			{/if}

			<!-- TAB TEMPLATE 2: PROCESS FLOW & KEY POINTS -->
			{#if currentMeta.templateType === 'process_flow'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-6">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value={activeTab} />
					<input type="hidden" name="contentJson" value={processContentJson} />

					<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
						<div>
							<div class="flex items-center gap-2">
								<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
									<CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> {currentMeta.name}
								</h3>
								<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-300">
									Template: Process Flow
								</span>
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Title, description, key points cards, and CTA banner.</p>
						</div>

						<div class="flex items-center gap-2 self-end sm:self-auto">
							<button
								type="button"
								onclick={(e) => duplicateSectionAction(activeTab, e)}
								disabled={isDuplicating}
								title="Duplicate this section"
								class="btn-secondary !p-2 text-xs flex items-center gap-1.5 cursor-pointer"
							>
								<Copy class="w-4 h-4 text-purple-600 dark:text-purple-400" />
								<span class="hidden sm:inline">Duplicate</span>
							</button>

							{#if currentMeta.isDuplicate}
								<button
									type="button"
									onclick={(e) => deleteSectionAction(activeTab, e)}
									disabled={isDeleting}
									title="Delete duplicated section"
									class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							{/if}

							<button
								type="button"
								onclick={() => (processHideSection = !processHideSection)}
								title={processHideSection ? 'Unhide Section' : 'Hide Section'}
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
						<!-- Editable Section Display Name -->
						<div class="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30">
							<label for="pf-sec-name" class="font-bold text-emerald-950 dark:text-emerald-200 block mb-1">Section Display Name (CMS Label & Admin Sidebar)</label>
							<input
								id="pf-sec-name"
								type="text"
								bind:value={activeSectionName}
								required
								placeholder="Process Flow Section Name"
								class="w-full bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-bold focus:border-purple-600 shadow-xs"
							/>
						</div>

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
										<input type="text" bind:value={card.badge} placeholder="Badge Text" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
										<input type="text" bind:value={card.title} placeholder="Card Title" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
										<textarea rows="2" bind:value={card.desc} placeholder="Card description..." class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs"></textarea>
										<input type="text" bind:value={card.tag} placeholder="Bottom Tagline" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold" />
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

			<!-- TAB TEMPLATE 3: PRODUCT SHOWCASE & SERVICES -->
			{#if currentMeta.templateType === 'how_it_works'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-6">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value={activeTab} />
					<input type="hidden" name="contentJson" value={howContentJson} />

					<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
						<div>
							<div class="flex items-center gap-2">
								<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
									<Layers class="w-4 h-4 text-amber-600 dark:text-amber-400" /> {currentMeta.name}
								</h3>
								<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300">
									Template: Product Showcase
								</span>
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Terminal feature cards, hardware upgrade CTA, and Solutions checklist.</p>
						</div>

						<div class="flex items-center gap-2 self-end sm:self-auto">
							<button
								type="button"
								onclick={(e) => duplicateSectionAction(activeTab, e)}
								disabled={isDuplicating}
								title="Duplicate this section"
								class="btn-secondary !p-2 text-xs flex items-center gap-1.5 cursor-pointer"
							>
								<Copy class="w-4 h-4 text-purple-600 dark:text-purple-400" />
								<span class="hidden sm:inline">Duplicate</span>
							</button>

							{#if currentMeta.isDuplicate}
								<button
									type="button"
									onclick={(e) => deleteSectionAction(activeTab, e)}
									disabled={isDeleting}
									title="Delete duplicated section"
									class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							{/if}

							<button
								type="button"
								onclick={() => (howHideSection = !howHideSection)}
								title={howHideSection ? 'Unhide Section' : 'Hide Section'}
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
						<!-- Editable Section Display Name -->
						<div class="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/30">
							<label for="how-sec-name" class="font-bold text-amber-950 dark:text-amber-200 block mb-1">Section Display Name (CMS Label & Admin Sidebar)</label>
							<input
								id="how-sec-name"
								type="text"
								bind:value={activeSectionName}
								required
								placeholder="Product Showcase Section Name"
								class="w-full bg-white dark:bg-slate-950 border border-amber-300 dark:border-amber-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-bold focus:border-purple-600 shadow-xs"
							/>
						</div>

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

						<!-- Product Features Grid Editor -->
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

						<!-- Hardware Upgrade CTA Banner Editor -->
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

						<!-- Complete In-House ATM Solutions Checklist Editor -->
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

			<!-- TAB TEMPLATE 4: ABOUT SECTION -->
			{#if currentMeta.templateType === 'about'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-5">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value={activeTab} />
					<input type="hidden" name="contentJson" value={aboutContentJson} />

					<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
						<div>
							<div class="flex items-center gap-2">
								<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
									<Info class="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> {currentMeta.name}
								</h3>
								<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-cyan-100 text-cyan-900 dark:bg-cyan-900/60 dark:text-cyan-300">
									Template: About
								</span>
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">High-risk guidelines, risk classification, and lead-in copy.</p>
						</div>

						<div class="flex items-center gap-2 self-end sm:self-auto">
							<button
								type="button"
								onclick={(e) => duplicateSectionAction(activeTab, e)}
								disabled={isDuplicating}
								title="Duplicate this section"
								class="btn-secondary !p-2 text-xs flex items-center gap-1.5 cursor-pointer"
							>
								<Copy class="w-4 h-4 text-purple-600 dark:text-purple-400" />
								<span class="hidden sm:inline">Duplicate</span>
							</button>

							{#if currentMeta.isDuplicate}
								<button
									type="button"
									onclick={(e) => deleteSectionAction(activeTab, e)}
									disabled={isDeleting}
									title="Delete duplicated section"
									class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							{/if}

							<button
								type="button"
								onclick={() => (aboutHideSection = !aboutHideSection)}
								title={aboutHideSection ? 'Unhide Section' : 'Hide Section'}
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
						<!-- Editable Section Display Name -->
						<div class="p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-800/60 bg-cyan-50/50 dark:bg-cyan-950/30">
							<label for="about-sec-name" class="font-bold text-cyan-950 dark:text-cyan-200 block mb-1">Section Display Name (CMS Label & Admin Sidebar)</label>
							<input
								id="about-sec-name"
								type="text"
								bind:value={activeSectionName}
								required
								placeholder="About Section Name"
								class="w-full bg-white dark:bg-slate-950 border border-cyan-300 dark:border-cyan-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-bold focus:border-purple-600 shadow-xs"
							/>
						</div>

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

			<!-- TAB TEMPLATE 5: CONTACT & SUPPORT SECTION -->
			{#if currentMeta.templateType === 'contact'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-5">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value={activeTab} />
					<input type="hidden" name="contentJson" value={contactContentJson} />

					<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
						<div>
							<div class="flex items-center gap-2">
								<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
									<Phone class="w-4 h-4 text-purple-600 dark:text-purple-400" /> {currentMeta.name}
								</h3>
								<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-900 dark:bg-purple-900/60 dark:text-purple-300">
									Template: Contact & Support
								</span>
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Phone, email, and support hours details.</p>
						</div>

						<div class="flex items-center gap-2 self-end sm:self-auto">
							<button
								type="button"
								onclick={(e) => duplicateSectionAction(activeTab, e)}
								disabled={isDuplicating}
								title="Duplicate this section"
								class="btn-secondary !p-2 text-xs flex items-center gap-1.5 cursor-pointer"
							>
								<Copy class="w-4 h-4 text-purple-600 dark:text-purple-400" />
								<span class="hidden sm:inline">Duplicate</span>
							</button>

							{#if currentMeta.isDuplicate}
								<button
									type="button"
									onclick={(e) => deleteSectionAction(activeTab, e)}
									disabled={isDeleting}
									title="Delete duplicated section"
									class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							{/if}

							<button
								type="button"
								onclick={() => (contactHideSection = !contactHideSection)}
								title={contactHideSection ? 'Unhide Section' : 'Hide Section'}
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
						<!-- Editable Section Display Name -->
						<div class="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/30">
							<label for="contact-sec-name" class="font-bold text-purple-950 dark:text-purple-200 block mb-1">Section Display Name (CMS Label & Admin Sidebar)</label>
							<input
								id="contact-sec-name"
								type="text"
								bind:value={activeSectionName}
								required
								placeholder="Contact Section Name"
								class="w-full bg-white dark:bg-slate-950 border border-purple-300 dark:border-purple-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-bold focus:border-purple-600 shadow-xs"
							/>
						</div>

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
										title={contactHideEmail ? 'Unhide Email' : 'Hide Email'}
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
										title={contactHidePhone ? 'Unhide Phone' : 'Hide Phone'}
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
										title={contactHideHours ? 'Unhide Hours' : 'Hide Hours'}
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
									title={contactHideNotice ? 'Unhide Notice' : 'Hide Notice'}
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

			<!-- TAB TEMPLATE 6: FAQS ACCORDION -->
			{#if currentMeta.templateType === 'faqs'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-6">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value={activeTab} />
					<input type="hidden" name="contentJson" value={faqsContentJson} />

					<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
						<div>
							<div class="flex items-center gap-2">
								<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
									<HelpCircle class="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> {currentMeta.name}
								</h3>
								<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-300">
									Template: FAQs Accordion
								</span>
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage FAQ questions and answers.</p>
						</div>

						<div class="flex items-center gap-2 self-end sm:self-auto">
							<button
								type="button"
								onclick={(e) => duplicateSectionAction(activeTab, e)}
								disabled={isDuplicating}
								title="Duplicate this section"
								class="btn-secondary !p-2 text-xs flex items-center gap-1.5 cursor-pointer"
							>
								<Copy class="w-4 h-4 text-purple-600 dark:text-purple-400" />
								<span class="hidden sm:inline">Duplicate</span>
							</button>

							{#if currentMeta.isDuplicate}
								<button
									type="button"
									onclick={(e) => deleteSectionAction(activeTab, e)}
									disabled={isDeleting}
									title="Delete duplicated section"
									class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							{/if}

							<button
								type="button"
								onclick={() => (faqsHideSection = !faqsHideSection)}
								title={faqsHideSection ? 'Unhide Section' : 'Hide Section'}
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
						<!-- Editable Section Display Name -->
						<div class="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30">
							<label for="faqs-sec-name" class="font-bold text-indigo-950 dark:text-indigo-200 block mb-1">Section Display Name (CMS Label & Admin Sidebar)</label>
							<input
								id="faqs-sec-name"
								type="text"
								bind:value={activeSectionName}
								required
								placeholder="FAQs Section Name"
								class="w-full bg-white dark:bg-slate-950 border border-indigo-300 dark:border-indigo-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-bold focus:border-purple-600 shadow-xs"
							/>
						</div>

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

			<!-- TAB TEMPLATE 7: FOOTER & FINAL CTA -->
			{#if currentMeta.templateType === 'footer'}
				<form method="POST" action="?/saveSection" use:enhance={handleFormEnhance} class="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-5">
					<input type="hidden" name="verticalId" value={data.activeVerticalId || ''} />
					<input type="hidden" name="sectionId" value={activeTab} />
					<input type="hidden" name="contentJson" value={footerContentJson} />

					<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
						<div>
							<div class="flex items-center gap-2">
								<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
									<ExternalLink class="w-4 h-4 text-rose-600 dark:text-rose-400" /> {currentMeta.name}
								</h3>
								<span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-900 dark:bg-rose-900/60 dark:text-rose-300">
									Template: Footer
								</span>
							</div>
							<p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Bottom CTA banner and copyright bar.</p>
						</div>

						<div class="flex items-center gap-2 self-end sm:self-auto">
							<button
								type="button"
								onclick={(e) => duplicateSectionAction(activeTab, e)}
								disabled={isDuplicating}
								title="Duplicate this section"
								class="btn-secondary !p-2 text-xs flex items-center gap-1.5 cursor-pointer"
							>
								<Copy class="w-4 h-4 text-purple-600 dark:text-purple-400" />
								<span class="hidden sm:inline">Duplicate</span>
							</button>

							{#if currentMeta.isDuplicate}
								<button
									type="button"
									onclick={(e) => deleteSectionAction(activeTab, e)}
									disabled={isDeleting}
									title="Delete duplicated section"
									class="p-2 rounded-xl transition-all border flex items-center justify-center cursor-pointer shadow-xs bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							{/if}

							<button
								type="button"
								onclick={() => (footerHideSection = !footerHideSection)}
								title={footerHideSection ? 'Unhide Section' : 'Hide Section'}
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
						<!-- Editable Section Display Name -->
						<div class="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/30">
							<label for="footer-sec-name" class="font-bold text-rose-950 dark:text-rose-200 block mb-1">Section Display Name (CMS Label & Admin Sidebar)</label>
							<input
								id="footer-sec-name"
								type="text"
								bind:value={activeSectionName}
								required
								placeholder="Footer Section Name"
								class="w-full bg-white dark:bg-slate-950 border border-rose-300 dark:border-rose-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-bold focus:border-purple-600 shadow-xs"
							/>
						</div>

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
						<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">Reorder Page Layout</h3>
						<p class="text-xs text-slate-600 dark:text-slate-400">Drag items, reorder, or duplicate section templates</p>
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
					{@const meta = getSectionMeta(secId)}
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
								<span class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{meta.name}</span>
							</div>
						</div>

						<div class="flex items-center gap-1 flex-shrink-0">
							<button
								type="button"
								onclick={(e) => duplicateSectionAction(secId, e)}
								title="Duplicate section"
								class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/40 text-slate-600 hover:text-purple-700 dark:text-slate-400 dark:hover:text-purple-300 cursor-pointer"
							>
								<Copy class="w-3.5 h-3.5" />
							</button>

							{#if meta.isDuplicate}
								<button
									type="button"
									onclick={(e) => deleteSectionAction(secId, e)}
									title="Delete duplicate section"
									class="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 cursor-pointer"
								>
									<Trash2 class="w-3.5 h-3.5" />
								</button>
							{/if}

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
