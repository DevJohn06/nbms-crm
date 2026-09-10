<script lang="ts">
	import { enhance } from '$app/forms';
	import { Rocket, Mail, Lock, ArrowRight, AlertCircle, User } from 'lucide-svelte';

	let { form, data } = $props();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);

	$effect(() => {
		if (form?.email) {
			email = form.email;
		}
	});
</script>

<svelte:head>
	<title>Sign In | NBMS CRM</title>
</svelte:head>

<div class="min-h-screen bg-[#f4f8fb] dark:bg-[#06101e] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-150">
	<!-- Ambient Background Glow Effects -->
	<div class="absolute -top-40 -left-40 w-96 h-96 bg-[#1f71c1]/15 rounded-full blur-3xl pointer-events-none"></div>
	<div class="absolute -bottom-40 -right-40 w-96 h-96 bg-[#4899be]/15 rounded-full blur-3xl pointer-events-none"></div>

	<div class="w-full max-w-md relative z-10 space-y-6">
		<!-- Brand & Header -->
		<div class="text-center space-y-3">
			<div class="flex items-center justify-center mb-1">
				<img src="/images/nbms_icon.png" alt="NBMS" class="h-14 w-14 object-contain drop-shadow-sm" />
			</div>
			<div>
				<h1 class="text-2xl font-black tracking-tight font-display text-slate-900 dark:text-slate-100">
					NBMS <span class="text-xs px-2 py-0.5 font-bold bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 rounded-full align-middle">CRM</span>
				</h1>
				<p class="text-xs text-slate-600 dark:text-slate-400 mt-1 font-semibold">Merchant Growth & Management Console</p>
			</div>
		</div>

		<!-- Login Glass Card -->
		<div class="glass-panel p-8 rounded-2xl border border-[#dbe7f1] dark:border-slate-800 shadow-xl space-y-6 backdrop-blur-xl bg-white/95 dark:bg-[#0a192f]/90">
			<div>
				<h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">Sign in to your account</h2>
				<p class="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">Access CRM control panel, leads, & client funnels</p>
			</div>

			{#if form?.error}
				<div class="p-3.5 rounded-xl bg-rose-100 text-rose-900 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30 text-xs flex items-start gap-3 animate-shake font-bold shadow-xs">
					<AlertCircle class="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
					<p>{form.error}</p>
				</div>
			{/if}

			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						update();
					};
				}}
				class="space-y-4"
			>
				<div class="space-y-1.5">
					<label for="email" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Username or Email Address</label>
					<div class="relative">
						<User class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
						<input
							id="email"
							name="email"
							type="text"
							required
							bind:value={email}
							placeholder="e.g. admin or admin@company.com"
							class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1f71c1] focus:ring-1 focus:ring-[#1f71c1] transition-all font-semibold shadow-xs"
						/>
					</div>
				</div>

				<div class="space-y-1.5">
					<label for="password" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
					<div class="relative">
						<Lock class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
						<input
							id="password"
							name="password"
							type="password"
							required
							bind:value={password}
							placeholder="••••••••••••"
							class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1f71c1] focus:ring-1 focus:ring-[#1f71c1] transition-all font-semibold shadow-xs"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full py-2.5 px-4 bg-gradient-to-r from-[#15528d] via-[#1f71c1] to-[#4899be] hover:from-[#00345a] hover:to-[#15528d] text-white text-xs font-bold rounded-xl shadow-md shadow-[#1f71c1]/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
				>
					{#if loading}
						<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Authenticating...
					{:else}
						<span>Sign In</span>
						<ArrowRight class="w-4 h-4" />
					{/if}
				</button>
			</form>
		</div>

		<!-- Footer Notice -->
		<p class="text-[11px] text-center text-slate-500 dark:text-slate-400 font-medium">
			Protected by NBMS Encrypted Auth Protocol & SQLite Session Management
		</p>
	</div>
</div>
