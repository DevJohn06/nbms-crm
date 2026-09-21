<script lang="ts">
	import './layout.css';
	import { page } from '$app/stores';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import {
		LayoutDashboard,
		Users,
		Mail,
		FileText,
		Sparkles,
		Rocket,
		Layers,
		CheckCircle2,
		ExternalLink,
		Globe,
		ShieldCheck,
		LogOut,
		Terminal,
		UserCheck,
		PhoneCall,
		Sun,
		Moon,
		AlertCircle
	} from 'lucide-svelte';

	let { data, children } = $props();

	let currentPath = $derived($page.url.pathname);
	let isDispensaryHost = $derived(
		typeof window !== 'undefined' &&
			(window.location.hostname.startsWith('dispensary.') ||
				window.location.hostname.includes('dispensary.nbmsinc.com'))
	);
	let isPublicFunnel = $derived(currentPath.startsWith('/funnel') || isDispensaryHost);
	let isLoginPage = $derived(currentPath.startsWith('/login'));
	let user = $derived(data.user);

	let themeMode = $state<'light' | 'dark'>(
		typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'
	);

	$effect(() => {
		if (typeof window !== 'undefined') {
			if (isPublicFunnel) {
				document.documentElement.classList.remove('dark');
			} else {
				const saved = localStorage.getItem('nbms_theme');
				if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
					themeMode = 'dark';
					document.documentElement.classList.add('dark');
				} else {
					themeMode = 'light';
					document.documentElement.classList.remove('dark');
				}
			}
		}
	});

	function toggleTheme() {
		if (themeMode === 'light') {
			themeMode = 'dark';
			document.documentElement.classList.add('dark');
			localStorage.setItem('nbms_theme', 'dark');
		} else {
			themeMode = 'light';
			document.documentElement.classList.remove('dark');
			localStorage.setItem('nbms_theme', 'light');
		}
	}
</script>

{#if isPublicFunnel}
	<!-- Public Client Funnel Layout (Pure Light Theme, No Dark Mode) -->
	<div class="min-h-screen bg-[#F4F8FB] text-slate-900 flex flex-col">
		{@render children()}
	</div>
{:else if isLoginPage}
	<!-- Login Page Layout -->
	<div class="min-h-screen bg-[#f4f8fb] dark:bg-[#06101e] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-150">
		{@render children()}
	</div>
{:else}
	<!-- Admin CRM Layout -->
	<div class="min-h-screen bg-[#f4f8fb] dark:bg-[#06101e] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-150">
		<!-- Sidebar Navigation -->
		<aside class="w-full md:w-64 glass-panel border-r border-[#dbe7f1] dark:border-slate-800/60 flex-shrink-0 flex flex-col justify-between bg-white/95 dark:bg-[#0a192f]/95 shadow-sm">
			<div>
				<!-- Brand Header -->
				<div class="p-4 border-b border-[#dbe7f1] dark:border-slate-800/60 flex items-center justify-between">
					<a href="/" class="flex items-center gap-2.5">
						<img src="/images/nbms_icon.png" alt="NBMS" class="h-8 w-8 object-contain" />
						<span class="font-black text-lg tracking-tight font-display text-slate-900 dark:text-slate-100">NBMS</span>
						<span class="px-1.5 py-0.5 text-[10px] font-bold bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 rounded">CRM</span>
					</a>
				</div>

				<!-- Navigation Menu -->
				<nav class="p-3 space-y-1">
					<a
						href="/"
						class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all {currentPath === '/' ? 'bg-sky-100/90 text-sky-950 border border-sky-200/90 dark:bg-sky-600/20 dark:text-sky-200 dark:border-sky-500/30 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'}"
					>
						<LayoutDashboard class="w-4 h-4 text-[#1f71c1] dark:text-[#6ec1e4]" />
						Dashboard
					</a>

					<a
						href="/leads"
						class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all {currentPath.startsWith('/leads') ? 'bg-sky-100/90 text-sky-950 border border-sky-200/90 dark:bg-sky-600/20 dark:text-sky-200 dark:border-sky-500/30 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'}"
					>
						<Users class="w-4 h-4 text-[#15528d] dark:text-sky-400" />
						Master Lead List
					</a>

					<a
						href="/calls"
						class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all {currentPath.startsWith('/calls') ? 'bg-sky-100/90 text-sky-950 border border-sky-200/90 dark:bg-sky-600/20 dark:text-sky-200 dark:border-sky-500/30 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'}"
					>
						<PhoneCall class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
						Booked Strategy Calls
					</a>

					<a
						href="/emails"
						class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all {currentPath === '/emails' ? 'bg-sky-100/90 text-sky-950 border border-sky-200/90 dark:bg-sky-600/20 dark:text-sky-200 dark:border-sky-500/30 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'}"
					>
						<Mail class="w-4 h-4 text-amber-600 dark:text-amber-400" />
						Inbox & Logs
					</a>

					<a
						href="/emails/templates"
						class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all {currentPath === '/emails/templates' ? 'bg-sky-100/90 text-sky-950 border border-sky-200/90 dark:bg-sky-600/20 dark:text-sky-200 dark:border-sky-500/30 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'}"
					>
						<Layers class="w-4 h-4 text-blue-600 dark:text-blue-400" />
						Email Scripts
					</a>

					{#if user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'}
						<a
							href="/verticals"
							class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all {currentPath.startsWith('/verticals') ? 'bg-sky-100/90 text-sky-950 border border-sky-200/90 dark:bg-sky-600/20 dark:text-sky-200 dark:border-sky-500/30 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'}"
						>
							<Layers class="w-4 h-4 text-sky-600 dark:text-sky-400" />
							Industry Verticals
						</a>
					{/if}

					<a
						href="/cms/intake"
						class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all {currentPath.startsWith('/cms') ? 'bg-sky-100/90 text-sky-950 border border-sky-200/90 dark:bg-sky-600/20 dark:text-sky-200 dark:border-sky-500/30 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'}"
					>
						<Globe class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
						Intake Page CMS
					</a>

					{#if user?.role === 'SUPER_ADMIN'}
						<div class="pt-3 pb-1 px-3">
							<p class="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
								<Terminal class="w-3 h-3 text-[#1f71c1] dark:text-[#6ec1e4]" />
								Developer Admin
							</p>
						</div>

						<a
							href="/users"
							class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all {currentPath.startsWith('/users') ? 'bg-sky-100/90 text-sky-950 border border-sky-200/90 dark:bg-sky-600/20 dark:text-sky-200 dark:border-sky-500/30 font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'}"
						>
							<ShieldCheck class="w-4 h-4 text-[#1f71c1] dark:text-[#6ec1e4]" />
							User & Dev Console
						</a>
					{/if}

					<div class="pt-3 pb-1 px-3">
						<p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Public Funnel Preview</p>
					</div>

					<a
						href="/funnel"
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 border border-transparent hover:border-cyan-200 dark:hover:border-cyan-500/20 transition-all"
					>
						<span class="flex items-center gap-3">
							<Sparkles class="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
							Public Intake Portal
						</span>
						<ExternalLink class="w-3.5 h-3.5 text-slate-400" />
					</a>
				</nav>
			</div>

			<!-- Footer User Profile & Status Card -->
			<div class="p-4 border-t border-[#dbe7f1] dark:border-slate-800/60 space-y-3">
				{#if user}
					<div class="p-3 rounded-xl bg-[#f0f7fc] dark:bg-slate-900/90 border border-[#dbe7f1] dark:border-slate-800/80 space-y-2">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2.5 overflow-hidden">
								<div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#15528d] to-[#1f71c1] text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs">
									{user.name.charAt(0).toUpperCase()}
								</div>
								<div class="truncate">
									<p class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
									<p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
								</div>
							</div>
						</div>

						<div class="flex items-center justify-between pt-2 border-t border-[#dbe7f1] dark:border-slate-800/60">
							{#if user.role === 'SUPER_ADMIN'}
								<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 flex items-center gap-1">
									<ShieldCheck class="w-3 h-3 text-[#1f71c1] dark:text-[#6ec1e4]" />
									SUPER ADMIN
								</span>
							{:else if user.role === 'ADMIN'}
								<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30 flex items-center gap-1">
									<UserCheck class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
									CRM ADMIN
								</span>
							{:else}
								<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
									SALES AGENT
								</span>
							{/if}

							<a
								href="/logout"
								class="p-1 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded transition-colors"
								title="Sign Out"
							>
								<LogOut class="w-3.5 h-3.5" />
							</a>
						</div>
					</div>
				{/if}

				<div class="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-[#dbe7f1] dark:border-slate-800/60 flex items-center gap-2.5">
					<div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
					<div>
						<p class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Auth & SQLite Engine</p>
						<p class="text-[9px] text-slate-500">Session Cookies Active</p>
					</div>
				</div>
			</div>
		</aside>

		<!-- Main Content Area -->
		<main class="flex-1 flex flex-col min-w-0 overflow-y-auto">
			<header class="h-16 glass-panel border-b border-[#dbe7f1] dark:border-slate-800/60 px-6 flex items-center justify-between sticky top-0 z-30 bg-white/95 dark:bg-[#0a192f]/95 backdrop-blur-md">
				<div class="flex items-center gap-3">
					<h1 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
						{#if currentPath === '/'}
							Executive Dashboard
						{:else if currentPath.startsWith('/leads')}
							Master Lead Directory
						{:else if currentPath.startsWith('/verticals')}
							Industry Verticals Console
						{:else if currentPath.startsWith('/calls')}
							Booked Strategy Calls
						{:else if currentPath === '/emails'}
							Email Center & Communication History
						{:else if currentPath === '/emails/templates'}
							Email Automation Templates
						{:else if currentPath.startsWith('/cms')}
							Intake Page CMS Editor
						{:else if currentPath.startsWith('/users')}
							Developer User Console
						{:else}
							NBMS Workspace
						{/if}
					</h1>
				</div>

				<div class="flex items-center gap-3">
					<!-- Vertical Selector Switcher in Header -->
					{#if user}
						{#if (data.assignedVerticals && data.assignedVerticals.length > 0) || ['SUPER_ADMIN', 'ADMIN'].includes(user.role)}
							<div class="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
								<Layers class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
								<span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">Vertical:</span>
								<select
									class="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 border-none outline-none cursor-pointer pr-1"
									value={data.activeVerticalParam || ''}
									onchange={(e) => {
										const v = e.currentTarget.value;
										const u = new URL(window.location.href);
										if (v) {
											u.searchParams.set('vertical', v);
										} else {
											u.searchParams.delete('vertical');
										}
										window.location.href = u.toString();
									}}
								>
									<option value="" class="bg-white dark:bg-slate-900">
										{['SUPER_ADMIN', 'ADMIN'].includes(user.role) ? 'All Verticals' : 'All Assigned Verticals'}
									</option>
									{#each (['SUPER_ADMIN', 'ADMIN'].includes(user.role) && data.allVerticals?.length > 0 ? data.allVerticals : data.assignedVerticals || []) as vert}
										<option value={vert.slug} class="bg-white dark:bg-slate-900">
											{vert.name}
										</option>
									{/each}
								</select>
							</div>
						{:else}
							<div class="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5" title="No industry verticals assigned to your account. Contact an administrator.">
								<AlertCircle class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
								<span class="hidden sm:inline">No Verticals Assigned</span>
							</div>
						{/if}
					{/if}

					<!-- Theme Toggle Switch -->
					<button
						onclick={toggleTheme}
						class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
						title="Toggle Light / Dark Mode"
					>
						{#if themeMode === 'light'}
							<Sun class="w-4 h-4 text-amber-500 animate-spin-slow" />
							<span>Light Mode</span>
						{:else}
							<Moon class="w-4 h-4 text-indigo-400" />
							<span>Dark Mode</span>
						{/if}
					</button>

					{#if user}
						<a
							href="/logout"
							class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1.5 transition-colors"
						>
							<LogOut class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
							Sign Out
						</a>
					{/if}
				</div>
			</header>

			<div class="p-6 flex-1 max-w-7xl w-full mx-auto">
				{@render children()}
			</div>
		</main>
	</div>
{/if}

<ToastContainer />
