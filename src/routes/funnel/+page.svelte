<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Rocket,
		CheckCircle2,
		ShieldCheck,
		CreditCard,
		FileText,
		Sparkles,
		Send,
		Phone,
		Mail,
		Building,
		AlertCircle,
		PhoneCall,
		Calendar,
		HelpCircle,
		ChevronDown,
		ChevronUp,
		Info,
		Clock,
		X,
		Check,
		User,
		DollarSign,
		ShieldAlert,
		Zap,
		Cpu,
		TrendingUp,
		Truck,
		PieChart,
		Headphones,
		Lock,
		Award,
		ArrowRight,
		Banknote,
		Landmark,
		BadgePercent,
		ThumbsUp,
		Eye
	} from 'lucide-svelte';

	let { data, form } = $props();

	let loading = $state(false);

	// Force light theme on funnel
	$effect(() => {
		if (typeof window !== 'undefined') {
			document.documentElement.classList.remove('dark');
		}
	});

	// Active Section ScrollSpy Tracking
	let activeSection = $state('home');

	$effect(() => {
		if (typeof window === 'undefined') return;

		const sectionIds = ['services', 'about', 'faq'];
		const observerOptions = {
			root: null,
			rootMargin: '-15% 0px -55% 0px',
			threshold: 0.1
		};

		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					activeSection = entry.target.id;
				}
			}
		}, observerOptions);

		const scrollHandler = () => {
			if (window.scrollY < 300) {
				activeSection = 'home';
			}
		};

		window.addEventListener('scroll', scrollHandler, { passive: true });
		scrollHandler();

		for (const id of sectionIds) {
			const el = document.getElementById(id);
			if (el) observer.observe(el);
		}

		return () => {
			observer.disconnect();
			window.removeEventListener('scroll', scrollHandler);
		};
	});

	// CTA Modal States
	let isGetInfoOpen = $state(false);
	let isBookCallOpen = $state(false);

	// FAQ Accordion State
	let openFaq = $state<number | null>(0); // First open by default

	let businessName = $state('');
	let email = $state('');
	let phone = $state('');
	let representativeName = $state('');
	let monthlyVolume = $state('');
	let notes = $state('');

	function toggleFaq(idx: number) {
		openFaq = openFaq === idx ? null : idx;
	}

	function scrollToSection(e: MouseEvent, targetId: string) {
		e.preventDefault();
		if (targetId === 'top') {
			window.scrollTo({ top: 0, behavior: 'smooth' });
			activeSection = 'home';
			return;
		}
		const el = document.getElementById(targetId);
		if (el) {
			const yOffset = -80;
			const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
			window.scrollTo({ top: y, behavior: 'smooth' });
			activeSection = targetId;
		}
	}

	let heroCms = $derived(data.cms?.hero);
	let aboutCms = $derived(data.cms?.about);
	let productCms = $derived(data.cms?.how_it_works);
	let processCms = $derived(data.cms?.process_flow);
	let contactCms = $derived(data.cms?.contact);
	let faqCms = $derived(data.cms?.faqs);
	let footerCms = $derived(data.cms?.footer);
	let sectionOrder = $derived(data.sectionOrder || ['hero', 'process_flow', 'how_it_works', 'about', 'contact', 'faqs', 'footer']);

	const defaultProcessSteps = [
		{ number: '01', title: 'Apply', desc: 'Submit your business information and processing requirements.' },
		{ number: '02', title: 'Get Approved', desc: 'Our underwriting team reviews your business and payment needs.' },
		{ number: '03', title: 'Receive Your Terminal', desc: 'Deploy your PIN debit/cashless ATM equipment.' },
		{ number: '04', title: 'Start Accepting Payments', desc: 'Begin processing transactions with daily direct bank settlements.' }
	];

	const faqs = [
		{
			question: 'What are cashless ATMs and how are they being used?',
			answer: 'A cashless ATM is very similar to a regular ATM where cardholders can request funds using their debit card and 4 digit PIN. However, instead of receiving cash, they will receive a receipt from the merchant. The merchant will receive the funds via ACH, comparable to debit and credit card payment systems, and the customer can avoid having to take out cash from a stand alone ATM.'
		},
		{
			question: 'Why Choose a Cashless ATM?',
			answer: 'NBMS created a payment processing solution that would allow high risk types of establishments to accept card payments, simplify the checkout experience for customers, and provide greater security by reducing the large amounts of cash being held and handled on location by these merchants.'
		},
		{
			question: 'Tired of submitting applications and not getting approved?',
			answer: 'We guarantee you’ll get approved with our cashless ATM solution within 24-48 business hours. Furthermore, there’s no risk of getting placed on the TMF/Match list by utilizing these services since you’re accepting transactions on the ATM rails, no different than your traditional ATM! Already on the TMF list? Then, give us a call, and we’ll help you start accepting cashless payments once again without paying significant fees.'
		},
		{
			question: 'How long does the approval and shipping process take?',
			answer: 'Once we receive the required documents and application for approval, we’ll be able to get you approved within 24 business hours. Once the approval and programming process is complete the terminal is shipped, and the unit will arrive as an “out of the box solution!”'
		},
		{
			question: 'When can I expect the funds in my account?',
			answer: 'Payments are real-time and funds are deposited into your bank account the next day. You’ll receive a FREE online portal to view all sales on a real time daily/weekly/monthly basis as well.'
		},
		{
			question: 'Who do I contact for support?',
			answer: 'We not only provide support from our US based support teams, but we always recommend contacting your NBMS Agent first. We constantly focus on building longstanding partnerships with each one of our Merchants plus we know more about your account than anyone else. Always contact your Agent first and they’ll take care of you. Plus, each terminal is backed with a one year manufacturer’s warranty, so if they break we will replace them.'
		},
		{
			question: 'How am I able to accept card purchases with this solution?',
			answer: 'Cashless ATM transactions are considered ATM withdrawals. The card must be present, and the four-digit pin number must be entered correctly in order for the transaction to get approved.'
		},
		{
			question: 'Are there any additional Cashless ATM Perks?',
			answer: `• Receive a state-of-the-art terminals (includes storefront and wireless units).
• NO personal information or financial documents required for approval. We simply need the standard KYC requirements for any merchant application.
• Card present pin-based transactions effectively reduce chargebacks (customer disputes) or the chance of fraudulent transactions.
• Unlike a traditional merchant account, there are NO rates or fees for any Cashless ATM transaction. The Cashless ATM transaction cost is charged to the customer in the form of an ATM fee saving your business hundreds, if not thousands of dollars every month!
• There is peace of mind and sense of security for all parties involved as these transactions are handled in a cashless manner.
• Incremental transactions allow your employees to receive additional tips (helps reduce employee attrition).
• Installation is easy. Simply plug the units in (or power on the wireless units) and you are ready to process, but we’re always on standby for any ongoing assistance.
• Transactions are discreet. Shown as ATM withdrawals on your customers bank statements.`
		}
	];

	const productFeatures = [
		{
			icon: DollarSign,
			title: '$5.00 Increment Pin Debit System',
			desc: 'Countertop cashless ATM terminals processing transactions smoothly in $5.00 increment steps.'
		},
		{
			icon: Cpu,
			title: 'EMV & PCI-Compliant Hardware',
			desc: 'Next-gen secure payment terminals with tap, chip, and PIN encryption at industry-leading wholesale pricing.'
		},
		{
			icon: CheckCircle2,
			title: 'Direct Bank Account Deposits',
			desc: 'Processing revenue deposits directly into your business checking account, keeping cash-on-hand low and eliminating theft risks.'
		},
		{
			icon: Zap,
			title: 'Zero Merchant Processing Costs',
			desc: 'Eliminates merchant transaction fees with transparent, ultra-low consumer convenience fees.'
		},
		{
			icon: TrendingUp,
			title: 'Higher Sales & Customer Experience',
			desc: 'Frictionless checkout experience that elevates customer satisfaction and yields higher average ticket sizes.'
		},
		{
			icon: Truck,
			title: 'In-Store & Home Delivery Mobility',
			desc: 'Easy, flexible, and portable payment system built for retail counters and home delivery services.'
		},
		{
			icon: Lock,
			title: 'Customizable $500 Limit Caps',
			desc: 'The merchant chooses their purchase dollar limits of up to $500.00 directly from their portal.'
		},
		{
			icon: PieChart,
			title: 'Real-Time Customized Reporting',
			desc: 'Specialized merchant login for live customized reporting on settlements, batches, and transactions.'
		},
		{
			icon: Headphones,
			title: '24/7 Priority Technical Support',
			desc: 'Around-the-clock technical assistance and underwriting support whenever you need help.'
		}
	];
</script>

<svelte:head>
	<title>{heroCms?.title || 'ATM Payment Processing Solutions | NBMS'}</title>
</svelte:head>

<div class="min-h-screen font-sans selection:bg-[#FFCC00] selection:text-black bg-[#F8FAFC] text-slate-900">
	<!-- Top Navigation Header -->
	<header class="sticky top-0 z-40 transition-colors duration-300 backdrop-blur-md bg-white/95 border-b border-slate-200/90 shadow-sm">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
			<!-- Logo Branding: NBMS -->
			<a href="/funnel" class="flex items-center gap-3">
				<img src="/images/nbms_logo.png" alt="NBMS - National Business Merchant Solutions" class="h-10 sm:h-12 w-auto object-contain" />
			</a>

			<!-- Header Navigation Links & Actions -->
			<div class="flex items-center gap-5 sm:gap-7">
				<nav class="hidden md:flex items-center gap-6 text-sm font-semibold">
					<a
						href="#top"
						onclick={(e) => scrollToSection(e, 'top')}
						class="transition-colors {activeSection === 'home' ? 'text-[#CA8A04] font-black underline decoration-2 underline-offset-4' : 'text-slate-700 hover:text-[#CA8A04]'}"
					>
						Home
					</a>

					<a
						href="#services"
						onclick={(e) => scrollToSection(e, 'services')}
						class="transition-colors {activeSection === 'services' ? 'text-[#CA8A04] font-black underline decoration-2 underline-offset-4' : 'text-slate-700 hover:text-[#CA8A04]'}"
					>
						Services
					</a>

					<a
						href="#about"
						onclick={(e) => scrollToSection(e, 'about')}
						class="transition-colors {activeSection === 'about' ? 'text-[#CA8A04] font-black underline decoration-2 underline-offset-4' : 'text-slate-700 hover:text-[#CA8A04]'}"
					>
						Why Us?
					</a>

					<a
						href="#faq"
						onclick={(e) => scrollToSection(e, 'faq')}
						class="transition-colors {activeSection === 'faq' ? 'text-[#CA8A04] font-black underline decoration-2 underline-offset-4' : 'text-slate-700 hover:text-[#CA8A04]'}"
					>
						FAQ
					</a>
				</nav>

				<div class="flex items-center gap-3">
					<button
						onclick={() => (isGetInfoOpen = true)}
						class="px-4 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-xs bg-yellow-50 text-yellow-950 border-yellow-300 hover:bg-yellow-100"
					>
						<Info class="w-3.5 h-3.5 text-[#CA8A04]" />
						<span>Get Info</span>
					</button>

					<button
						onclick={() => (isBookCallOpen = true)}
						class="px-5 py-2 rounded-full text-xs font-black transition-all cursor-pointer bg-[#FFCC00] hover:bg-[#E6B800] text-black shadow-md shadow-yellow-500/25 hover:scale-105 flex items-center gap-1.5"
					>
						<PhoneCall class="w-3.5 h-3.5 text-black" />
						<span>Book Call</span>
					</button>
				</div>
			</div>
		</div>
	</header>

	<!-- FULL-WIDTH HERO SECTION (TRUE SUNNY YELLOW ACCENTS) -->
	{#if !heroCms?.content?.hideSection}
		<section class="w-full relative overflow-hidden transition-all bg-[#ccd4dc] min-h-[460px] sm:min-h-[520px] flex items-center border-b border-slate-300">
			<!-- Background Photography (Hand holding payment card on right) -->
			<div
				class="absolute inset-0 bg-cover bg-right md:bg-[center_right_12%] bg-no-repeat w-full h-full pointer-events-none opacity-95"
				style="background-image: url('/images/tfi_hero_bg.jpg');"
			></div>

			<!-- Blueprint Grid Line Overlay on the Left Side -->
			<div
				class="absolute inset-0 pointer-events-none"
				style="
					background-image: 
						linear-gradient(to right, rgba(255, 255, 255, 0.45) 1.5px, transparent 1.5px),
						linear-gradient(to bottom, rgba(255, 255, 255, 0.45) 1.5px, transparent 1.5px);
					background-size: 76px 76px;
					mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 65%);
					-webkit-mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 65%);
				"
			></div>

			<!-- Soft Ambient Gradient for Legibility -->
			<div class="absolute inset-0 pointer-events-none bg-gradient-to-r from-slate-900/35 via-slate-900/10 to-transparent"></div>

			<!-- Hero Content Container -->
			<div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 w-full">
				<div class="space-y-6">
					<!-- Hero Overlay Banner Box (Translucent Charcoal Layout) -->
					<div class="bg-[#3c4652]/70 backdrop-blur-xs px-6 py-5 sm:px-8 sm:py-6 md:px-9 md:py-7 shadow-2xl space-y-3.5 w-fit max-w-4xl">
						<!-- Line 1: Main Title (Serif Style on a single line) -->
						{#if !heroCms?.content?.hideTitle}
							<h1 class="text-2xl sm:text-3xl md:text-[36px] lg:text-[40px] font-normal text-white tracking-wide font-serif leading-tight whitespace-normal md:whitespace-nowrap">
								{heroCms?.title || 'ATM Payment Processing Solutions'}
							</h1>
						{/if}

						<!-- Line 2: Subtitle -->
						{#if !heroCms?.content?.hideSubtitle}
							<p class="text-base sm:text-xl md:text-[22px] font-normal text-white tracking-normal leading-snug">
								{heroCms?.subtitle || 'Apply Today, Be In Business Tomorrow!'}
							</p>
						{/if}

						<!-- Line 3: Tagline -->
						{#if !heroCms?.content?.hideTagline}
							<p class="text-sm sm:text-base md:text-[17px] font-bold uppercase tracking-wider text-white pt-1">
								{heroCms?.content?.tagline || 'THEY DECLINE. WE APPROVE.'}
							</p>
						{/if}
					</div>

					<!-- Hero CTAs (True Sunny Yellow) -->
					{#if !heroCms?.content?.hidePrimaryCta || !heroCms?.content?.hideSecondaryCta}
						<div class="flex flex-wrap items-center gap-3.5 pt-2">
							{#if !heroCms?.content?.hidePrimaryCta}
								<button
									type="button"
									onclick={() => (isGetInfoOpen = true)}
									class="px-8 py-3.5 rounded-full font-black text-xs sm:text-sm transition-all duration-200 shadow-lg shadow-yellow-500/25 flex items-center justify-center gap-2 cursor-pointer bg-[#FFCC00] hover:bg-[#E6B800] text-black hover:scale-105"
								>
									<Info class="w-4 h-4 text-black" />
									<span>{heroCms?.content?.primaryCta || 'Get Info'}</span>
									<ArrowRight class="w-4 h-4 text-black" />
								</button>
							{/if}

							{#if !heroCms?.content?.hideSecondaryCta}
								<button
									type="button"
									onclick={() => (isBookCallOpen = true)}
									class="px-8 py-3.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer bg-white hover:bg-yellow-50 text-slate-950 border-2 border-[#FFCC00] hover:scale-105"
								>
									<PhoneCall class="w-4 h-4 text-[#CA8A04]" />
									<span>{heroCms?.content?.secondaryCta || 'Book A Call'}</span>
								</button>
							{/if}
						</div>
					{/if}

					<!-- Sub-Hero Badges -->
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
						<div class="p-2.5 rounded-xl border text-center flex items-center justify-center gap-2 font-bold text-[11px] bg-white/95 border-slate-300 text-slate-900 shadow-xs">
							<ShieldCheck class="w-4 h-4 text-[#CA8A04] flex-shrink-0" />
							<span>PCI Compliance</span>
						</div>

						<div class="p-2.5 rounded-xl border text-center flex items-center justify-center gap-2 font-extrabold text-[11px] bg-white/95 border-slate-300 text-slate-900 shadow-xs">
							<CheckCircle2 class="w-4 h-4 text-[#CA8A04] flex-shrink-0" />
							<span>No Credit Check</span>
						</div>

						<div class="p-2.5 rounded-xl border text-center flex items-center justify-center gap-2 font-bold text-[11px] bg-white/95 border-slate-300 text-slate-900 shadow-xs">
							<Clock class="w-4 h-4 text-[#CA8A04] flex-shrink-0" />
							<span>24 Hr Settlement</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
		<!-- Submission Notification Success Card -->
		{#if form?.success}
			<div class="p-8 sm:p-12 rounded-3xl border text-center space-y-6 animate-fade-in bg-white border-yellow-300 shadow-2xl text-slate-900">
				<div class="w-20 h-20 rounded-full bg-yellow-100 border border-yellow-300 text-[#CA8A04] mx-auto flex items-center justify-center">
					<CheckCircle2 class="w-10 h-10" />
				</div>
				<div class="space-y-2">
					<span class="inline-block px-3 py-1 rounded-lg text-xs font-black bg-yellow-100 text-yellow-950 border border-yellow-300 uppercase tracking-wider">
						{#if form.actionType === 'getInfo'}
							Information Request Received
						{:else if form.actionType === 'bookCall'}
							Strategy Session Scheduled
						{:else}
							Application Submitted Successfully
						{/if}
					</span>
					<h1 class="text-3xl sm:text-4xl font-black font-display tracking-tight text-slate-950">
						{#if form.actionType === 'getInfo'}
							We've received your request, {form.businessName}!
						{:else if form.actionType === 'bookCall'}
							Call Booked for {form.clientName}!
						{:else}
							Welcome to NBMS, {form.businessName}!
						{/if}
					</h1>
					<p class="text-sm max-w-xl mx-auto text-slate-700 font-medium">
						{#if form.actionType === 'getInfo'}
							A confirmation email has been sent to <strong class="text-[#CA8A04] font-mono">{form.email}</strong>. Our onboarding consultant will reach out to you within 1 business hour with your rate proposal.
						{:else if form.actionType === 'bookCall'}
							Your merchant strategy session is confirmed for <strong class="text-[#CA8A04] font-mono">{form.callDate ? new Date(form.callDate).toLocaleString() : 'scheduled date'}</strong>. Check your inbox for calendar invites.
						{:else}
							Your merchant intake request has been registered under Application Reference <strong class="text-[#CA8A04] font-mono">#{form.contractId}</strong>.
						{/if}
					</p>
				</div>

				<div class="pt-4 border-t border-slate-200 max-w-md mx-auto">
					<button
						onclick={() => window.location.reload()}
						class="py-3.5 px-8 rounded-full bg-[#FFCC00] hover:bg-[#E6B800] text-black font-black text-xs shadow-lg shadow-yellow-500/25 transition-all cursor-pointer"
					>
						Return to Merchant Portal
					</button>
				</div>
			</div>
		{:else}

			{#if form?.error}
				<div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs flex items-center gap-3 w-full">
					<AlertCircle class="w-4 h-4 text-rose-500 flex-shrink-0" />
					<p class="font-semibold">{form.error}</p>
				</div>
			{/if}

			<!-- DYNAMICALLY ORDERED CMS SECTIONS -->
			{#each sectionOrder as secId}
				{#if secId === 'how_it_works' && !productCms?.content?.hideSection}
					<!-- SECTION: PRODUCT SHOWCASE – NBMS PIN DEBIT CASHLESS ATM -->
					<section id="how_it_works" class="space-y-8 pt-6 border-t border-slate-200 w-full scroll-mt-20">
						<div class="text-center space-y-3 w-full">
							{#if !productCms?.content?.hideTitle}
								<h2 class="text-3xl sm:text-4xl font-black font-display text-slate-950">
									{productCms?.title || 'NBMS Pin Debit Cashless ATM'}
								</h2>
							{/if}
							{#if !productCms?.content?.hideSubtitle}
								<p class="text-sm sm:text-base font-semibold max-w-3xl mx-auto text-slate-700">
									{productCms?.subtitle || 'Next-generation EMV & PCI-compliant payment terminals engineered for countertop checkout, home delivery, and zero merchant transaction costs.'}
								</p>
							{/if}
						</div>

						{#if !productCms?.content?.hideSteps && !productCms?.content?.hideFeaturesGrid}
							<div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
								{#each (productCms?.content?.features?.length ? productCms.content.features : productFeatures) as feature, idx}
									<div class="p-6 rounded-3xl border space-y-3 transition-all hover:scale-[1.02] bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-yellow-400">
										<div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-yellow-100 text-[#CA8A04] border border-yellow-300">
											{#if feature.icon}
												<feature.icon class="w-6 h-6" />
											{:else if productFeatures[idx]?.icon}
												{@const IconComp = productFeatures[idx].icon}
												<IconComp class="w-6 h-6" />
											{:else}
												<CheckCircle2 class="w-6 h-6" />
											{/if}
										</div>
										<h3 class="font-extrabold text-base text-slate-900">
											{feature.title}
										</h3>
										<p class="text-xs sm:text-sm leading-relaxed font-medium text-slate-700">
											{feature.desc || feature.description}
										</p>
									</div>
								{/each}
							</div>
						{/if}

						<!-- PRODUCT SHOWCASE CTAS -->
						{#if !productCms?.content?.hideHardwareCta}
							<div class="pt-6 p-8 rounded-3xl border text-center space-y-4 w-full bg-gradient-to-r from-yellow-50/80 via-white to-yellow-50/80 border-yellow-300 shadow-md text-slate-900">
								<h3 class="font-black text-xl text-slate-950">{productCms?.content?.hardwareCta?.title || 'Ready to Upgrade Your Checkout Hardware?'}</h3>
								<p class="text-sm font-semibold max-w-2xl mx-auto text-slate-700">
									{productCms?.content?.hardwareCta?.subtitle || 'Start processing cashless Pin Debit payments with zero merchant fees and daily direct bank deposits.'}
								</p>
								<div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
									<button
										onclick={() => (isGetInfoOpen = true)}
										class="px-8 py-3.5 rounded-full font-black text-sm bg-[#FFCC00] hover:bg-[#E6B800] text-black shadow-lg shadow-yellow-500/25 cursor-pointer hover:scale-105 transition-all"
									>
										{productCms?.content?.hardwareCta?.primaryCta || 'Get Terminal Proposal'}
									</button>
									<button
										onclick={() => (isBookCallOpen = true)}
										class="px-8 py-3.5 rounded-full font-bold text-sm bg-white hover:bg-yellow-50 text-slate-950 border-2 border-[#FFCC00] shadow-lg cursor-pointer hover:scale-105 transition-all"
									>
										{productCms?.content?.hardwareCta?.secondaryCta || 'Book Equipment Demo'}
									</button>
								</div>
							</div>
						{/if}
					</section>
				{:else if secId === 'process_flow' && !processCms?.content?.hideSection}
					<!-- SECTION: WHAT IS AN ATM MERCHANT ACCOUNT -->
					<section id="process" class="w-full relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl scroll-mt-20 my-6">
						<div class="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[440px] sm:min-h-[480px]">
							<div class="lg:col-span-5 relative min-h-[300px] sm:min-h-[380px] lg:min-h-[480px] bg-slate-900 overflow-hidden">
								<img
									src="/images/atm_terminal_hand.jpg"
									alt="ATM Merchant Account Card Reader Terminal"
									class="absolute inset-0 w-full h-full object-cover object-center"
								/>
							</div>

							<div class="lg:col-span-7 relative p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-[#F8FAFC] overflow-hidden">
								<div
									class="absolute right-0 bottom-0 w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] bg-no-repeat bg-contain bg-right-bottom pointer-events-none opacity-45"
									style="background-image: url('/images/grid_squares.jpg');"
								></div>

								<div class="relative z-10 space-y-6 max-w-2xl">
									{#if !processCms?.content?.hideTitle}
										<h2 class="text-2xl sm:text-3xl md:text-[34px] lg:text-[38px] font-normal font-serif text-slate-900 tracking-tight leading-tight">
											{processCms?.title || 'What is an ATM Merchant Account?'}
										</h2>
									{/if}

									{#if !processCms?.content?.hideSubtitle}
										<p class="text-sm sm:text-base md:text-[15px] lg:text-[16px] text-slate-700 font-normal leading-relaxed">
											{processCms?.subtitle || "An ATM merchant account isn't a standard bank account but a specialized service allowing businesses to process electronic payments (cards, digital wallets) by acting as a temporary holding account for customer funds before transferring them to your regular business checking account, facilitated by a merchant service provider and an acquiring bank, essential for modern non-cash transactions and often involving fees."}
										</p>
									{/if}

									<div class="flex flex-wrap items-center gap-4 pt-3">
										<button
											type="button"
											onclick={() => (isGetInfoOpen = true)}
											class="px-8 py-3.5 rounded-full font-black text-xs sm:text-sm bg-[#FFCC00] hover:bg-[#E6B800] text-black shadow-lg shadow-yellow-500/25 cursor-pointer hover:scale-105 transition-all flex items-center gap-2"
										>
											<Info class="w-4 h-4 text-black" />
											<span>{processCms?.content?.primaryCta || 'Get Info'}</span>
											<ArrowRight class="w-4 h-4 text-black" />
										</button>

										<button
											type="button"
											onclick={() => (isBookCallOpen = true)}
											class="px-8 py-3.5 rounded-full font-bold text-xs sm:text-sm bg-white hover:bg-yellow-50 text-slate-950 border-2 border-[#FFCC00] shadow-md cursor-pointer hover:scale-105 transition-all flex items-center gap-2"
										>
											<PhoneCall class="w-4 h-4 text-[#CA8A04]" />
											<span>{processCms?.content?.secondaryCta || 'Book A Call'}</span>
										</button>
									</div>
								</div>
							</div>
						</div>
					</section>

					<!-- SECTION: KEY POINTS / ATM SOLUTION ADVANTAGES -->
					{#if !processCms?.content?.hideKeyPoints}
						<section id="key-points" class="w-full my-8 scroll-mt-20">
							<div class="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
								<div>
									<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100/80 border border-yellow-300 text-yellow-900 text-xs font-black uppercase tracking-wider mb-2">
										<Sparkles class="w-3.5 h-3.5 text-[#CA8A04]" />
										<span>Key Advantages</span>
									</div>
									<h3 class="text-2xl sm:text-3xl font-serif text-slate-900 font-normal">
										Why Cash-Only Businesses Choose NBMS
									</h3>
								</div>
								<div class="text-left sm:text-right">
									<span class="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">Key Points</span>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
								{#each (processCms?.content?.keyPoints?.length ? processCms.content.keyPoints : [
									{
										badge: 'Cash Reduction',
										title: 'Smart ATM Payment Solution for Cash-Only Businesses',
										desc: 'Our ATM payment solution is perfect for cash-only businesses as it drastically reduces the amount of cash on hand.',
										tag: 'Drastically reduces cash on hand'
									},
									{
										badge: 'Unlimited Scale',
										title: 'Unlimited ATM machines, Faster Checkouts',
										desc: 'Order as many ATM machines as you need to reduce customer wait times.',
										tag: 'Reduces customer wait times & queues'
									},
									{
										badge: '0% Merchant Cost',
										title: 'Zero Merchant Fees.',
										desc: 'Our ATM payment solution is paid for by the customer. An easy choice when many of our competitors are charging the merchant a percentage of each sale based on transaction volume at an average of 4.95% up to 6% plus flat dollar amount per transaction.',
										tag: 'Save 4.95% to 6% + flat fee per transaction'
									}
								]) as card, cardIdx}
									{@const themes = [
										{ border: 'border-emerald-200/90', bg: 'from-emerald-50/50', iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white', badge: 'bg-emerald-100/90 text-emerald-800 border-emerald-200', tag: 'text-emerald-700', IconComp: Banknote },
										{ border: 'border-indigo-200/90', bg: 'from-indigo-50/50', iconBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white', badge: 'bg-indigo-100/90 text-indigo-800 border-indigo-200', tag: 'text-indigo-700', IconComp: Landmark },
										{ border: 'border-amber-300/90', bg: 'from-amber-50/60', iconBg: 'bg-amber-500/15 border-amber-500/25 text-amber-700 group-hover:bg-amber-500 group-hover:text-black', badge: 'bg-amber-100/90 text-amber-950 border-amber-300', tag: 'text-amber-900', IconComp: BadgePercent }
									]}
									{@const theme = themes[cardIdx % 3]}
									<div class="group relative rounded-3xl border {theme.border} bg-gradient-to-b {theme.bg} via-white to-white p-7 shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between overflow-hidden">
										<div class="space-y-4 relative z-10">
											<div class="flex items-center justify-between">
												<div class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-all duration-300 {theme.iconBg}">
													<theme.IconComp class="w-7 h-7" />
												</div>
												<span class="text-[10px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full border shadow-xs {theme.badge}">
													{card.badge || 'Advantage'}
												</span>
											</div>

											<h4 class="text-lg sm:text-xl font-bold font-serif text-slate-900 leading-snug">
												{card.title}
											</h4>

											<p class="text-slate-600 text-sm leading-relaxed">
												{card.desc}
											</p>
										</div>

										<div class="pt-5 mt-6 border-t border-slate-100 flex items-center gap-2 text-xs font-bold {theme.tag} relative z-10">
											<CheckCircle2 class="w-4 h-4 flex-shrink-0" />
											<span>{card.tag}</span>
										</div>
									</div>
								{/each}
							</div>

							<!-- STRATEGIC CTA BANNER BELOW KEY POINTS CARDS -->
							{#if !processCms?.content?.hideCtaBanner}
								<div class="mt-8 p-6 sm:p-8 lg:p-10 rounded-3xl border border-yellow-300/90 bg-gradient-to-r from-yellow-50/90 via-white to-amber-50/90 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
									<div class="space-y-2 text-center lg:text-left relative z-10 max-w-xl">
										<div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-200/70 border border-yellow-400 text-yellow-950 text-xs font-black uppercase tracking-wider mb-1">
											<Sparkles class="w-3.5 h-3.5 text-[#CA8A04]" />
											<span>{processCms?.content?.ctaBanner?.badge || 'Zero Merchant Fees'}</span>
										</div>
										<h4 class="text-xl sm:text-2xl lg:text-3xl font-black font-serif text-slate-950 leading-tight">
											{processCms?.content?.ctaBanner?.title || 'Ready to Eliminate Credit Card Processing Fees?'}
										</h4>
										<p class="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
											{processCms?.content?.ctaBanner?.subtitle || 'Get an instant customized terminal proposal or schedule a direct consultation with our underwriting team today.'}
										</p>
									</div>

									<div class="flex flex-wrap items-center justify-center gap-4 relative z-10 flex-shrink-0">
										<button
											type="button"
											onclick={() => (isGetInfoOpen = true)}
											class="px-7 py-3.5 rounded-full font-black text-xs sm:text-sm bg-[#FFCC00] hover:bg-[#E6B800] text-black shadow-lg shadow-yellow-500/25 cursor-pointer hover:scale-105 transition-all flex items-center gap-2"
										>
											<Info class="w-4 h-4 text-black" />
											<span>{processCms?.content?.ctaBanner?.primaryCta || processCms?.content?.primaryCta || 'Get Info'}</span>
											<ArrowRight class="w-4 h-4 text-black" />
										</button>

										<button
											type="button"
											onclick={() => (isBookCallOpen = true)}
											class="px-7 py-3.5 rounded-full font-bold text-xs sm:text-sm bg-white hover:bg-yellow-50 text-slate-950 border-2 border-[#FFCC00] shadow-md cursor-pointer hover:scale-105 transition-all flex items-center gap-2"
										>
											<PhoneCall class="w-4 h-4 text-[#CA8A04]" />
											<span>{processCms?.content?.ctaBanner?.secondaryCta || processCms?.content?.secondaryCta || 'Book A Call'}</span>
										</button>
									</div>
								</div>
							{/if}
						</section>
					{/if}

					<!-- SECTION: COMPLETE IN-HOUSE ATM SOLUTIONS -->
					{#if !productCms?.content?.hideServicesSection}
						<section id="services" class="w-full my-10 scroll-mt-20 space-y-8">
							<div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
								{#each (productCms?.content?.servicesSection?.topBadges || [
									{ title: '24 Hour Account Approval', IconComp: ThumbsUp, color: 'emerald' },
									{ title: 'High Approval Rate', IconComp: TrendingUp, color: 'indigo' },
									{ title: 'Dedicated Billing Descriptors', IconComp: FileText, color: 'purple' },
									{ title: 'Transparent Underwriting', IconComp: Eye, color: 'amber' }
								]) as badgeItem, bIdx}
									<div class="group relative rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/70 via-white to-white p-5 text-center shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center space-y-3">
										<div class="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-[#CA8A04] group-hover:scale-110 group-hover:bg-[#FFCC00] group-hover:text-black transition-all">
											<CheckCircle2 class="w-5 h-5" />
										</div>
										<h4 class="text-sm sm:text-base font-bold font-serif text-slate-900 leading-snug">
											{badgeItem.title}
										</h4>
									</div>
								{/each}
							</div>

							<div class="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 lg:p-14 shadow-xl space-y-8 relative overflow-hidden">
								<div
									class="absolute right-0 bottom-0 w-[300px] h-[300px] bg-no-repeat bg-contain bg-right-bottom pointer-events-none opacity-30"
									style="background-image: url('/images/grid_squares.jpg');"
								></div>

								<div class="space-y-4 max-w-3xl relative z-10">
									<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100/80 border border-yellow-300 text-yellow-950 text-xs font-black uppercase tracking-wider">
										<Sparkles class="w-3.5 h-3.5 text-[#CA8A04]" />
										<span>End-To-End Services</span>
									</div>
									<h2 class="text-3xl sm:text-4xl lg:text-[42px] font-normal font-serif text-slate-900 tracking-tight leading-tight">
										{productCms?.content?.servicesSection?.title || 'Complete In-House ATM Solutions'}
									</h2>
									<p class="text-slate-700 text-sm sm:text-base leading-relaxed">
										{productCms?.content?.servicesSection?.subtitle1 || 'From ATM processing to equipment, we offer a comprehensive set of solutions designed to streamline day-to-day business operations and increase your revenues.'}
									</p>
									<p class="text-slate-700 text-sm sm:text-base leading-relaxed">
										{productCms?.content?.servicesSection?.subtitle2 || 'From authorization to settlement, we efficiently handle the lifecycle of each transaction to ensure each is both valid and secure while providing comprehensive reporting with instant visibility of your ATM transactions.'}
									</p>
								</div>

								<div class="pt-6 border-t border-slate-100 relative z-10">
									<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
										{#each (productCms?.content?.servicesSection?.checklist?.length ? productCms.content.servicesSection.checklist : [
											'ATM hardware',
											'ATM compliance',
											'Secure, real time transaction processing',
											'ATM management platform',
											'Powerful reporting tools',
											'24/7 support'
										]) as item}
											<div class="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs hover:border-yellow-400 hover:bg-yellow-50/50 transition-all">
												<div class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-300">
													<CheckCircle2 class="w-4 h-4 text-emerald-600" />
												</div>
												<span class="text-xs sm:text-sm font-bold text-slate-900">{item}</span>
											</div>
										{/each}
									</div>
								</div>

								<div class="pt-6 border-t border-slate-100 flex flex-wrap items-center gap-4 relative z-10">
									<button
										type="button"
										onclick={() => (isGetInfoOpen = true)}
										class="px-8 py-3.5 rounded-full font-black text-xs sm:text-sm bg-[#FFCC00] hover:bg-[#E6B800] text-black shadow-lg shadow-yellow-500/25 cursor-pointer hover:scale-105 transition-all flex items-center gap-2"
									>
										<Info class="w-4 h-4 text-black" />
										<span>{productCms?.content?.servicesSection?.primaryCta || 'Get Info'}</span>
										<ArrowRight class="w-4 h-4 text-black" />
									</button>

									<button
										type="button"
										onclick={() => (isBookCallOpen = true)}
										class="px-8 py-3.5 rounded-full font-bold text-xs sm:text-sm bg-white hover:bg-yellow-50 text-slate-950 border-2 border-[#FFCC00] shadow-md cursor-pointer hover:scale-105 transition-all flex items-center gap-2"
									>
										<PhoneCall class="w-4 h-4 text-[#CA8A04]" />
										<span>{productCms?.content?.servicesSection?.secondaryCta || 'Book A Call'}</span>
									</button>
								</div>
							</div>
						</section>
					{/if}
				{:else if secId === 'about' && !aboutCms?.content?.hideSection}
					<!-- SECTION: HIGH-RISK BUSINESS CATEGORIES -->
					<section id="about" class="space-y-6 pt-10 border-t border-slate-200 w-full scroll-mt-20">
						<div class="p-8 sm:p-10 rounded-3xl border space-y-6 w-full bg-white border-slate-200 shadow-md">
							{#if !aboutCms?.content?.hideTitle}
								<h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-slate-900 tracking-tight">
									{aboutCms?.title || 'High-Risk Business Categories'}
								</h2>
							{/if}

							<div class="text-xs sm:text-sm lg:text-base leading-relaxed space-y-4 font-normal text-slate-700">
								{#if !aboutCms?.content?.hideDescription}
									{#if aboutCms?.content?.description}
										<p class="whitespace-pre-line leading-relaxed">
											{aboutCms.content.description}
										</p>
									{:else}
										<p>
											The first thing to understand about high-risk businesses is that your processor will determine whether you fall into one of their high-risk categories when you apply for a merchant account. Either you’re high-risk, or you’re not – there is no middle ground. Beyond that, it gets complicated as every processor has their own unique guidelines for determining whether you’re in the high-risk category. While some business types, will almost always be placed in the high-risk group, others may or may not be. Some merchant services providers have very strict guidelines for determining high-risk status, while others use more relaxed criteria. If you’re considering a particular provider, check their website or contact them directly to see if they find your business to be high-risk. This can save you a lot of time and effort in wasted applications to providers who aren’t going to approve you.
										</p>
										<p>
											How a merchant services provider treats a high-risk business can also vary widely. Many providers, particularly those that try to offer merchant services at the lowest possible prices, simply do not accept any high-risk businesses at all. This helps to reduce their exposure to fraud and keeps costs low for their existing clients. You will find most providers will allow certain high-risk companies, but will charge you significantly higher rates and fees for your merchant account due to the elevated risk they’re accepting by giving you a merchant account. There’s also a third category of providers who specialize in placing high-risk businesses. While their rates and fees aren’t a good deal for non-high-risk merchants, they can often provide a merchant account for high-risk businesses that have been turned down by other providers.
										</p>
									{/if}
								{/if}
							</div>

							{#if !aboutCms?.content?.hideNotice}
								<p class="text-xs sm:text-sm font-semibold text-slate-800 pt-2 border-t border-slate-100">
									{aboutCms?.content?.transitionNotice || 'We’re always just a phone call away and are more than happy to answer any of your questions, but here are a few questions that we get asked all the time.'}
								</p>
							{/if}
						</div>
					</section>
				{:else if secId === 'contact' && contactCms && !contactCms?.content?.hideSection}
					<!-- SECTION: CONTACT & SUPPORT -->
					<section id="contact" class="space-y-6 pt-6 border-t border-slate-200 w-full scroll-mt-20">
						<div class="p-8 rounded-3xl border space-y-6 w-full bg-gradient-to-r from-yellow-50/80 via-white to-slate-50 border-yellow-200 shadow-md text-slate-900">
							<div class="text-center space-y-2 max-w-2xl mx-auto">
								{#if !contactCms?.content?.hideTitle}
									<h3 class="text-2xl sm:text-3xl font-black font-display">{contactCms.title}</h3>
								{/if}
								{#if !contactCms?.content?.hideSubtitle}
									<p class="text-xs sm:text-sm font-medium text-slate-700">{contactCms.subtitle}</p>
								{/if}
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
								{#if !contactCms?.content?.hidePhone && contactCms.content?.phone}
									<div class="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs space-y-1">
										<Phone class="w-5 h-5 mx-auto text-[#CA8A04]" />
										<p class="text-xs font-bold text-slate-400 uppercase">Support Line</p>
										<a href="tel:{contactCms.content.phone}" class="text-sm font-black text-[#CA8A04] hover:underline">{contactCms.content.phone}</a>
									</div>
								{/if}

								{#if !contactCms?.content?.hideEmail && contactCms.content?.email}
									<div class="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs space-y-1">
										<Mail class="w-5 h-5 mx-auto text-[#CA8A04]" />
										<p class="text-xs font-bold text-slate-400 uppercase">Support Email</p>
										<a href="mailto:{contactCms.content.email}" class="text-sm font-black text-[#CA8A04] hover:underline">{contactCms.content.email}</a>
									</div>
								{/if}

								{#if !contactCms?.content?.hideHours && contactCms.content?.hours}
									<div class="p-4 rounded-2xl border bg-white border-slate-200 shadow-xs space-y-1">
										<Clock class="w-5 h-5 mx-auto text-[#CA8A04]" />
										<p class="text-xs font-bold text-slate-400 uppercase">Operating Hours</p>
										<p class="text-sm font-black text-slate-800">{contactCms.content.hours}</p>
									</div>
								{/if}
							</div>

							{#if !contactCms?.content?.hideNotice && contactCms.content?.helpNotice}
								<div class="p-4 rounded-2xl border text-center text-xs font-bold bg-yellow-100/70 text-yellow-950 border-yellow-300">
									{contactCms.content.helpNotice}
								</div>
							{/if}
						</div>
					</section>
				{:else if secId === 'faqs' && !faqCms?.content?.hideSection}
					<!-- FREQUENTLY ASKED QUESTIONS SECTION -->
					<section id="faq" class="pt-10 border-t border-slate-200 space-y-8 w-full scroll-mt-20">
						<div class="text-center space-y-3 w-full">
							<h2 class="text-3xl sm:text-4xl font-black font-display text-slate-950">
								{faqCms?.title || 'Frequently Asked Questions'}
							</h2>
							<p class="text-sm sm:text-base font-medium max-w-3xl mx-auto text-slate-700">
								{faqCms?.subtitle || 'Everything you need to know about ATM processing, high-risk approval, PCI security, and settlements.'}
							</p>
						</div>

						{#if !faqCms?.content?.hideFaqItems}
							<div class="space-y-4 w-full">
								{#each (faqCms?.content?.items?.length ? faqCms.content.items : faqs) as faq, i}
									<div class="rounded-3xl border transition-all overflow-hidden w-full bg-white border-slate-200 shadow-sm">
										<button
											onclick={() => toggleFaq(i)}
											class="w-full p-5 text-left font-extrabold text-sm sm:text-base flex items-center justify-between gap-4 cursor-pointer transition-colors hover:text-[#CA8A04] text-slate-900"
										>
											<span class="flex items-center gap-3">
												<HelpCircle class="w-5 h-5 text-[#CA8A04] flex-shrink-0" />
												{faq.question}
											</span>
											{#if openFaq === i}
												<ChevronUp class="w-5 h-5 text-[#CA8A04] flex-shrink-0" />
											{:else}
												<ChevronDown class="w-5 h-5 text-slate-400 flex-shrink-0" />
											{/if}
										</button>

										{#if openFaq === i}
											<div class="px-6 pb-5 pt-2 text-xs sm:text-sm leading-relaxed font-medium border-t text-slate-800 bg-slate-50/80 border-slate-200 whitespace-pre-line">
												{faq.answer}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</section>
				{:else if secId === 'footer'}
					<!-- STRATEGIC FOOTER CTA & FOOTER BAR -->
					<section id="footer-cta" class="w-full my-8 scroll-mt-20 space-y-6">
						{#if !footerCms?.content?.hideCtaBanner}
							<div class="pt-6 p-8 rounded-3xl border text-center space-y-4 w-full bg-gradient-to-r from-yellow-50/80 via-white to-yellow-50/80 border-yellow-300 shadow-md text-slate-900">
								<h3 class="font-black text-xl sm:text-2xl text-slate-950">{footerCms?.content?.ctaBanner?.title || 'Ready to Get Started with NBMS?'}</h3>
								<p class="text-sm font-semibold max-w-2xl mx-auto text-slate-700">
									{footerCms?.content?.ctaBanner?.subtitle || 'Start processing cashless Pin Debit payments with zero merchant fees and daily direct bank deposits.'}
								</p>
								<div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
									<button
										type="button"
										onclick={() => (isGetInfoOpen = true)}
										class="px-8 py-3.5 rounded-full font-black text-sm bg-[#FFCC00] hover:bg-[#E6B800] text-black shadow-lg shadow-yellow-500/25 cursor-pointer hover:scale-105 transition-all flex items-center gap-2"
									>
										<Info class="w-4 h-4 text-black" />
										<span>{footerCms?.content?.ctaBanner?.primaryCta || 'Get Info'}</span>
										<ArrowRight class="w-4 h-4 text-black" />
									</button>
									<button
										type="button"
										onclick={() => (isBookCallOpen = true)}
										class="px-8 py-3.5 rounded-full font-bold text-sm bg-white hover:bg-yellow-50 text-slate-950 border-2 border-[#FFCC00] shadow-md cursor-pointer hover:scale-105 transition-all flex items-center gap-2"
									>
										<PhoneCall class="w-4 h-4 text-[#CA8A04]" />
										<span>{footerCms?.content?.ctaBanner?.secondaryCta || 'Book A Call'}</span>
									</button>
								</div>
							</div>
						{/if}

						<footer class="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium pb-8">
							<div class="flex items-center gap-3">
								<img src="/images/nbms_logo.png" alt="NBMS Logo" class="h-8 w-auto object-contain" />
								<span>{footerCms?.content?.copyright || '© 2026 NBMS INC. All rights reserved.'}</span>
							</div>
							<div class="flex items-center gap-6">
								<a href="#top" onclick={(e) => scrollToSection(e, 'top')} class="hover:text-[#CA8A04] transition-colors">Home</a>
								<a href="#services" onclick={(e) => scrollToSection(e, 'services')} class="hover:text-[#CA8A04] transition-colors">Services</a>
								<a href="#about" onclick={(e) => scrollToSection(e, 'about')} class="hover:text-[#CA8A04] transition-colors">Why Us?</a>
								<a href="#faq" onclick={(e) => scrollToSection(e, 'faq')} class="hover:text-[#CA8A04] transition-colors">FAQ</a>
							</div>
						</footer>
					</section>
				{/if}
			{/each}
		{/if}
	</main>
</div>

<!-- CTA 1 MODAL: GET INFO FORM -->
{#if isGetInfoOpen}
	<div class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
		<div class="glass-panel w-full max-w-2xl sm:max-w-3xl p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 relative bg-white border-slate-200 text-slate-900 shadow-slate-900/10 max-h-[90vh] overflow-y-auto">
			<div class="flex items-center justify-between border-b pb-4 border-slate-200">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-100 text-[#CA8A04]">
						<Info class="w-5 h-5" />
					</div>
					<div>
						<h3 class="font-extrabold text-lg sm:text-xl text-slate-950">Request Rate Proposal & Info</h3>
						<p class="text-xs font-medium text-slate-600">Receive an automated rate quote and consultant follow-up.</p>
					</div>
				</div>
				<button onclick={() => (isGetInfoOpen = false)} class="p-1 rounded-lg cursor-pointer text-slate-500 hover:text-slate-900">
					<X class="w-5 h-5" />
				</button>
			</div>

			<form
				method="POST"
				action="?/submitGetInfo"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						isGetInfoOpen = false;
						update();
					};
				}}
				class="space-y-4"
			>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="get-info-business" class="block text-xs font-bold mb-1.5 text-slate-900">Business Name *</label>
						<input id="get-info-business" type="text" name="businessName" required placeholder="e.g. Metro Retail & Cafe" class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium placeholder-slate-500 focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]" />
					</div>

					<div>
						<label for="get-info-rep" class="block text-xs font-bold mb-1.5 text-slate-900">Contact Name</label>
						<input id="get-info-rep" type="text" name="representativeName" placeholder="e.g. Michael Scott" class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium placeholder-slate-500 focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]" />
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="get-info-email" class="block text-xs font-bold mb-1.5 text-slate-900">Email Address *</label>
						<input id="get-info-email" type="email" name="email" required placeholder="owner@metroretail.com" class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium placeholder-slate-500 focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]" />
					</div>

					<div>
						<label for="get-info-phone" class="block text-xs font-bold mb-1.5 text-slate-900">Phone Number *</label>
						<input id="get-info-phone" type="text" name="phone" required placeholder="+1 (555) 019-2834" class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium placeholder-slate-500 focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]" />
					</div>
				</div>

				<div>
					<label for="get-info-volume" class="block text-xs font-bold mb-1.5 text-slate-900">Estimated Monthly Volume</label>
					<select id="get-info-volume" name="monthlyVolume" class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]">
						<option value="Under $25,000 / month">Under $25,000 / month</option>
						<option value="$25,000 - $100,000 / month">$25,000 - $100,000 / month</option>
						<option value="$100,000 - $250,000 / month">$100,000 - $250,000 / month</option>
						<option value="Over $250,000 / month">Over $250,000 / month</option>
					</select>
				</div>

				<div class="flex justify-start gap-3 pt-4 border-t border-slate-200">
					<button type="button" onclick={() => (isGetInfoOpen = false)} class="btn-secondary text-xs sm:text-sm cursor-pointer">Cancel</button>
					<button type="submit" disabled={loading} class="px-6 py-2.5 rounded-full font-black text-xs sm:text-sm bg-[#FFCC00] hover:bg-[#E6B800] text-black shadow-md shadow-yellow-500/20 cursor-pointer disabled:opacity-50">
						{#if loading}Submitting...{:else}Send Me Rate Proposal & Email{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- CTA 2 MODAL: BOOK A CALL (CALENDLY INTEGRATION) -->
{#if isBookCallOpen}
	<div class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
		<div class="glass-panel w-full max-w-2xl sm:max-w-3xl p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 relative bg-white border-slate-200 text-slate-900 shadow-slate-900/10 max-h-[90vh] overflow-y-auto">
			<div class="flex items-center justify-between border-b pb-4 border-slate-200">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl flex items-center justify-center bg-yellow-100 text-[#CA8A04]">
						<PhoneCall class="w-5 h-5" />
					</div>
					<div>
						<h3 class="font-extrabold text-lg sm:text-xl text-slate-950">Book A Strategy Session</h3>
						<p class="text-xs font-medium text-slate-600">Powered by Calendly & NBMS CRM Scheduling.</p>
					</div>
				</div>
				<button onclick={() => (isBookCallOpen = false)} class="p-1 rounded-lg cursor-pointer text-slate-500 hover:text-slate-900">
					<X class="w-5 h-5" />
				</button>
			</div>

			<form
				method="POST"
				action="?/bookCall"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						isBookCallOpen = false;
						update();
					};
				}}
				class="space-y-4"
			>
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="book-name" class="block text-xs font-bold mb-1.5 text-slate-900">Your Full Name *</label>
						<input id="book-name" type="text" name="clientName" required placeholder="e.g. Sarah Jenkins" class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium placeholder-slate-500 focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]" />
					</div>

					<div>
						<label for="book-email" class="block text-xs font-bold mb-1.5 text-slate-900">Email Address *</label>
						<input id="book-email" type="email" name="clientEmail" required placeholder="sarah@jenkinsretail.com" class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium placeholder-slate-500 focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]" />
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="book-business" class="block text-xs font-bold mb-1.5 text-slate-900">Business Name</label>
						<input id="book-business" type="text" name="businessName" placeholder="e.g. Jenkins Retail" class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium placeholder-slate-500 focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]" />
					</div>

					<div>
						<label for="book-phone" class="block text-xs font-bold mb-1.5 text-slate-900">Direct Phone Number</label>
						<input id="book-phone" type="text" name="clientPhone" placeholder="+1 (555) 019-2834" class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium placeholder-slate-500 focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]" />
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="book-date" class="block text-xs font-bold mb-1 text-slate-900">Preferred Date & Time *</label>
						<p class="text-[11px] font-medium text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded-lg px-2.5 py-1 mb-1.5 flex items-center gap-1.5 shadow-2xs">
							<Clock class="w-3.5 h-3.5 text-[#CA8A04] shrink-0" />
							<span>We are available 24/7, please allow a 1 day notice</span>
						</p>
						<input id="book-date" type="datetime-local" name="callDate" required class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]" />
					</div>

					<div>
						<label for="book-timezone" class="block text-xs font-bold mb-1.5 text-slate-900">Timezone *</label>
						<select id="book-timezone" name="timezone" class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]">
							<option value="Eastern Time (ET)">Eastern Time (ET)</option>
							<option value="Central Time (CT)">Central Time (CT)</option>
							<option value="Mountain Time (MT)">Mountain Time (MT)</option>
							<option value="Pacific Time (PT)">Pacific Time (PT)</option>
							<option value="Alaska Time (AKT)">Alaska Time (AKT)</option>
							<option value="Hawaii Time (HT)">Hawaii Time (HT)</option>
							<option value="Greenwich Mean Time (GMT/UTC)">Greenwich Mean Time (GMT/UTC)</option>
							<option value="Central European Time (CET)">Central European Time (CET)</option>
							<option value="Other / International">Other / International</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div>
						<label for="book-format" class="block text-xs font-bold mb-1.5 text-slate-900">Do you prefer a zoom call or a direct call?</label>
						<select id="book-format" name="callPreference" class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]">
							<option value="Zoom Call">Zoom Call</option>
							<option value="Direct Call">Direct Call</option>
						</select>
					</div>

					<div>
						<label for="book-topic" class="block text-xs font-bold mb-1.5 text-slate-900">Meeting Topic</label>
						<select id="book-topic" name="meetingType" class="w-full rounded-xl p-3 text-xs sm:text-sm focus:outline-none bg-slate-50 border border-slate-300 text-slate-900 font-medium focus:bg-white focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]">
							<option value="Pin Debit Cashless ATM Consultation">Pin Debit Cashless ATM Consultation</option>
							<option value="High-Risk Merchant Account Review">High-Risk Merchant Account Review</option>
							<option value="Interchange Rate Audit">Interchange Rate Audit</option>
							<option value="POS Hardware & Delivery Terminal Setup">POS Hardware & Delivery Terminal Setup</option>
						</select>
					</div>
				</div>

				<div class="flex justify-start gap-3 pt-4 border-t border-slate-200">
					<button type="button" onclick={() => (isBookCallOpen = false)} class="btn-secondary text-xs sm:text-sm cursor-pointer">Cancel</button>
					<button type="submit" disabled={loading} class="px-6 py-2.5 rounded-full font-black text-xs sm:text-sm bg-[#FFCC00] hover:bg-[#E6B800] text-black shadow-md shadow-yellow-500/20 cursor-pointer disabled:opacity-50">
						{#if loading}Booking Call...{:else}Confirm & Book Strategy Call{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
