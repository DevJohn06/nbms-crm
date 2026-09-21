<script lang="ts">
	import { enhance } from '$app/forms';
	import { navigating } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { toastStore } from '$lib/toast.svelte';
	import {
		ShieldAlert,
		UserPlus,
		Users,
		ShieldCheck,
		UserCheck,
		KeyRound,
		Trash2,
		Sparkles,
		CheckCircle2,
		AlertCircle,
		Terminal,
		Lock,
		Edit3,
		X,
		RefreshCw,
		Loader2,
		Layers
	} from 'lucide-svelte';

	let { data, form } = $props();

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

	let isDeleteUserConfirmOpen = $state(false);
	let userToDeleteId = $state<string | null>(null);
	let userToDeleteName = $state<string>('');

	function promptDeleteUser(id: string, name: string) {
		userToDeleteId = id;
		userToDeleteName = name;
		isDeleteUserConfirmOpen = true;
	}

	async function confirmDeleteUser() {
		if (!userToDeleteId) return;
		const id = userToDeleteId;
		userToDeleteId = null;

		isRefreshing = true;
		const form = new FormData();
		form.append('userId', id);
		try {
			await fetch('?/deleteUser', { method: 'POST', body: form });
			await invalidateAll();
			toastStore.success('User Account Deleted', `Removed user account for ${userToDeleteName}.`);
		} catch (err) {
			console.error(err);
			toastStore.error('Delete Failed', 'Could not delete user account.');
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
				toastStore.success('Action Successful', 'User account records updated.');
			} else if (result.type === 'failure') {
				toastStore.error('Operation Failed', result.data?.error || 'Failed to update user record.');
			}
		};
	}

	let showAddModal = $state(false);

	// Reset password modal state
	let resetUserId = $state<string | null>(null);
	let resetUserName = $state<string>('');
	let newPasswordInput = $state('');

	// Edit user profile & credentials modal state
	let editUser = $state<any>(null);
	let editName = $state('');
	let editEmail = $state('');
	let editNewPassword = $state('');
	let editCurrentPassword = $state('');

	function openResetModal(id: string, name: string) {
		resetUserId = id;
		resetUserName = name;
		newPasswordInput = '';
	}

	function closeResetModal() {
		resetUserId = null;
		resetUserName = '';
		newPasswordInput = '';
	}

	let assignVerticalsUser = $state<any>(null);
	let assignVerticalIds = $state<string[]>([]);
	let addRole = $state<'SUPER_ADMIN' | 'ADMIN' | 'AGENT'>('AGENT');
	let addVerticalIds = $state<string[]>([]);

	function openAssignModal(userRecord: any) {
		if (userRecord.role === 'SUPER_ADMIN' || userRecord.role === 'ADMIN') return;
		assignVerticalsUser = userRecord;
		assignVerticalIds = (userRecord.assignedVerticals || []).map((v: any) => v.id);
	}

	function closeAssignModal() {
		assignVerticalsUser = null;
		assignVerticalIds = [];
	}

	function toggleAssignVertical(vId: string) {
		if (assignVerticalIds.includes(vId)) {
			assignVerticalIds = assignVerticalIds.filter((id) => id !== vId);
		} else {
			assignVerticalIds = [...assignVerticalIds, vId];
		}
	}

	function toggleAddVertical(vId: string) {
		if (addVerticalIds.includes(vId)) {
			addVerticalIds = addVerticalIds.filter((id) => id !== vId);
		} else {
			addVerticalIds = [...addVerticalIds, vId];
		}
	}

	function openEditModal(userRecord: any) {
		editUser = userRecord;
		editName = userRecord.name;
		editEmail = userRecord.email;
		editNewPassword = '';
		editCurrentPassword = '';
		assignVerticalIds = (userRecord.assignedVerticals || []).map((v: any) => v.id);
	}

	function closeEditModal() {
		editUser = null;
		editName = '';
		editEmail = '';
		editNewPassword = '';
		editCurrentPassword = '';
		assignVerticalIds = [];
	}

	let isR2BackingUp = $state(false);
	let r2BackupStatus = $state<{ success: boolean; message: string; timestamp?: string } | null>(null);

	async function triggerR2Backup() {
		isR2BackingUp = true;
		r2BackupStatus = null;
		try {
			const res = await fetch('/api/admin/r2-backup', { method: 'POST' });
			const data = await res.json();
			if (res.ok && data.success) {
				r2BackupStatus = {
					success: true,
					message: 'SQLite database snapshot successfully uploaded to Cloudflare R2 bucket!',
					timestamp: new Date().toLocaleTimeString()
				};
			} else {
				r2BackupStatus = {
					success: false,
					message: data.message || 'R2 backup failed. Check R2 credentials in .env.'
				};
			}
		} catch (err: any) {
			r2BackupStatus = {
				success: false,
				message: err?.message || 'Connection error to R2 backup endpoint.'
			};
		} finally {
			isR2BackingUp = false;
		}
	}
</script>

<svelte:head>
	<title>User Management & Dev Console | NBMS CRM</title>
</svelte:head>

<div class="space-y-6">
	<!-- Page Header Banner -->
	<div class="glass-panel p-6 rounded-2xl border border-[#dbe7f1] dark:border-sky-500/30 bg-gradient-to-r from-white via-sky-50 to-slate-50 dark:from-[#0a192f] dark:via-slate-900/60 dark:to-slate-950/80 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
		<div class="space-y-1 relative z-10">
			<div class="flex items-center gap-2">
				<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 flex items-center gap-1.5">
					<Terminal class="w-3 h-3 text-[#1f71c1] dark:text-sky-400" />
					DEV SUPER ADMIN CONSOLE
				</span>
				<span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-100 text-cyan-900 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30">System Access: Full</span>
			</div>
			<h1 class="text-2xl font-black tracking-tight font-display text-slate-900 dark:text-slate-100">User Access & Role Management</h1>
			<p class="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
				Manage authentication accounts, developer privileges, system administrators, and sales agents for NBMS CRM.
			</p>
		</div>

		<button
			onclick={() => (showAddModal = true)}
			class="btn-primary flex items-center gap-2 text-xs py-2.5 px-4 shadow-md relative z-10"
		>
			<UserPlus class="w-4 h-4" />
			+ Add User Account
		</button>
	</div>

	<!-- Status Feedback Notifications -->
	{#if form?.error}
		<div class="p-4 rounded-xl bg-rose-100 text-rose-900 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30 text-xs flex items-center gap-3 font-bold shadow-xs animate-shake">
			<AlertCircle class="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
			<p>{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="p-4 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 text-xs flex items-center gap-3 font-bold shadow-xs">
			<CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
			<p>{form.message}</p>
		</div>
	{/if}



	<!-- User Accounts Table -->
	<div class="glass-panel rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden relative">
		<div class="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
			<div class="flex items-center gap-2">
				<Users class="w-4 h-4 text-purple-600 dark:text-purple-400" />
				<h2 class="text-sm font-bold text-slate-900 dark:text-slate-200">System Users Directory</h2>
			</div>

			<div class="flex items-center gap-3">
				<button
					type="button"
					onclick={refreshData}
					disabled={isLoading}
					class="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs disabled:opacity-50"
					title="Refresh users table data"
				>
					<RefreshCw class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 {isLoading ? 'animate-spin' : ''}" />
					<span>Refresh</span>
				</button>
				<span class="text-xs text-slate-500 font-medium">{data.usersList.length} accounts configured</span>
			</div>
		</div>

		<!-- Top Progress Shimmer Bar -->
		{#if isLoading}
			<div class="w-full bg-slate-200/50 dark:bg-slate-800/50 h-1 overflow-hidden relative z-20">
				<div class="bg-gradient-to-r from-purple-600 via-cyan-400 to-purple-600 h-full w-full animate-pulse"></div>
			</div>
		{/if}

		<!-- Table Overlay when loading existing records -->
		{#if isLoading && data.usersList.length > 0}
			<div class="absolute inset-0 bg-white/50 dark:bg-slate-950/50 backdrop-blur-[1.5px] z-10 flex items-center justify-center transition-all">
				<div class="px-4 py-2.5 rounded-full bg-slate-900/90 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xl border border-purple-500/30 flex items-center gap-2.5 text-xs font-bold shadow-purple-500/10">
					<Loader2 class="w-4 h-4 animate-spin text-purple-400 dark:text-purple-600" />
					<span>Refreshing users directory...</span>
				</div>
			</div>
		{/if}

		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs text-slate-800 dark:text-slate-300">
				<thead class="bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
					<tr>
						<th class="px-5 py-3">User Name & Email</th>
						<th class="px-5 py-3">Assigned Role</th>
						<th class="px-5 py-3">Role Selector</th>
						<th class="px-5 py-3">Assigned Verticals</th>
						<th class="px-5 py-3">Created Date</th>
						<th class="px-5 py-3 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-transparent">
					{#each data.usersList as user (user.id)}
						<tr class="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
							<td class="px-5 py-3.5">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-full bg-purple-100 text-purple-900 dark:bg-slate-800 dark:text-slate-200 border border-purple-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold shadow-xs">
										{user.name.charAt(0).toUpperCase()}
									</div>
									<div>
										<p class="font-bold text-slate-900 dark:text-slate-100">{user.name}</p>
										<p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{user.email}</p>
									</div>
								</div>
							</td>

							<td class="px-5 py-3.5">
								{#if user.role === 'SUPER_ADMIN'}
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40">
										<ShieldCheck class="w-3 h-3 text-purple-600 dark:text-purple-400" />
										Super Admin (Dev)
									</span>
								{:else if user.role === 'ADMIN'}
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40">
										<UserCheck class="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
										CRM Admin
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
										Sales Agent
									</span>
								{/if}
							</td>

							<td class="px-5 py-3.5">
								{#if user.role === 'SUPER_ADMIN'}
									<div class="inline-flex items-center gap-1.5" title="Super Admin role is locked and cannot be downgraded">
										<select
											disabled
											class="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 font-semibold shadow-2xs cursor-not-allowed opacity-80"
										>
											<option value="SUPER_ADMIN" selected>SUPER_ADMIN</option>
										</select>
										<Lock class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
									</div>
								{:else}
									<form method="POST" action="?/updateRole" use:enhance={handleFormEnhance} class="inline-block">
										<input type="hidden" name="userId" value={user.id} />
										<select
											name="newRole"
											onchange={(e) => e.currentTarget.form?.requestSubmit()}
											class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:border-purple-600 shadow-xs cursor-pointer"
										>
											<option value="SUPER_ADMIN" selected={user.role === 'SUPER_ADMIN'}>SUPER_ADMIN</option>
											<option value="ADMIN" selected={user.role === 'ADMIN'}>ADMIN</option>
											<option value="AGENT" selected={user.role === 'AGENT'}>AGENT</option>
										</select>
									</form>
								{/if}
							</td>

							<td class="px-5 py-3.5">
								{#if user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'}
									<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
										<Layers class="w-3 h-3 text-purple-600 dark:text-purple-400" />
										All Verticals
									</span>
								{:else}
									<div class="flex items-center gap-1.5 flex-wrap max-w-xs">
										{#if user.assignedVerticals && user.assignedVerticals.length > 0}
											{#each user.assignedVerticals as vert}
												<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30">
													<Layers class="w-2.5 h-2.5 text-sky-600 dark:text-sky-400" />
													{vert.name}
												</span>
											{/each}
										{:else}
											<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
												<AlertCircle class="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
												No Verticals Assigned
											</span>
										{/if}
										<button
											type="button"
											onclick={() => openAssignModal(user)}
											class="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-sky-600 transition-colors cursor-pointer"
											title="Assign or modify verticals"
										>
											<Edit3 class="w-3 h-3" />
										</button>
									</div>
								{/if}
							</td>

							<td class="px-5 py-3.5 text-slate-500 font-medium">
								{new Date(user.createdAt).toLocaleDateString()}
							</td>

							<td class="px-5 py-3.5 text-right">
								<div class="flex items-center justify-end gap-2">
									<button
										onclick={() => openEditModal(user)}
										class="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 text-[11px] font-bold flex items-center gap-1 border border-purple-200 dark:border-purple-500/30 transition-colors shadow-xs"
										title="Edit Name, Email & Password"
									>
										<Edit3 class="w-3 h-3 text-purple-600 dark:text-purple-400" />
										Edit Profile
									</button>

									<button
										onclick={() => openResetModal(user.id, user.name)}
										class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors"
										title="Reset Password"
									>
										<KeyRound class="w-3 h-3 text-purple-600 dark:text-purple-400" />
										Reset Pass
									</button>

									{#if data.usersList.length > 1}
										<button
											type="button"
											onclick={() => promptDeleteUser(user.id, user.name)}
											class="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 cursor-pointer"
											title="Delete User"
										>
											<Trash2 class="w-3.5 h-3.5" />
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Cloudflare R2 Database Backup Widget -->
	<div class="glass-panel p-6 rounded-2xl border border-cyan-200 dark:border-cyan-500/30 bg-gradient-to-r from-white via-cyan-50 to-slate-50 dark:from-slate-900 dark:via-cyan-950/20 dark:to-slate-950 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
		<div class="space-y-1">
			<div class="flex items-center gap-2">
				<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30">
					Cloudflare R2 Object Storage
				</span>
			</div>
			<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">Automated SQLite Database Snapshot Backup</h3>
			<p class="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
				Backup current SQLite database state (`local.db`) directly into configured Cloudflare R2 bucket.
			</p>
			{#if r2BackupStatus}
				<p class="text-xs font-bold mt-2 {r2BackupStatus.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}">
					{r2BackupStatus.message} {r2BackupStatus.timestamp ? `(${r2BackupStatus.timestamp})` : ''}
				</p>
			{/if}
		</div>

		<button
			onclick={triggerR2Backup}
			disabled={isR2BackingUp}
			class="btn-primary text-xs flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 border-none shadow-md disabled:opacity-50"
		>
			{#if isR2BackingUp}
				<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
				Backing Up to R2...
			{:else}
				<Sparkles class="w-4 h-4" />
				Trigger R2 Snapshot Backup
			{/if}
		</button>
	</div>
</div>

<!-- Modal: Add New User Account -->
{#if showAddModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
		<div class="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
					<UserPlus class="w-5 h-5 text-purple-600 dark:text-purple-400" />
					Add CRM User Account
				</h3>
				<button onclick={() => (showAddModal = false)} class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
					<X class="w-5 h-5" />
				</button>
			</div>

			<form method="POST" action="?/createUser" use:enhance={() => {
				return async ({ update }) => {
					showAddModal = false;
					update();
				};
			}} class="space-y-4">
				<div class="space-y-1.5">
					<label for="new-name" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
					<input id="new-name" name="name" required placeholder="Alex Mercer" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-none" />
				</div>

				<div class="space-y-1.5">
					<label for="new-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Email Address *</label>
					<input id="new-email" name="email" type="email" required placeholder="alex@nbmsinc.com" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#1f71c1] focus:outline-none" />
				</div>

				<div class="space-y-1.5">
					<label for="new-pass" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Initial Password *</label>
					<input id="new-pass" name="password" type="password" required placeholder="••••••••••••" class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#1f71c1] focus:outline-none" />
				</div>

				<div class="space-y-1.5">
					<label for="new-role" class="block text-xs font-bold text-slate-700 dark:text-slate-300">System Role *</label>
					<select id="new-role" name="role" bind:value={addRole} class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#1f71c1] focus:outline-none font-semibold">
						<option value="AGENT">SALES AGENT (Standard CRM access)</option>
						<option value="ADMIN">CRM ADMIN (Full lead & team management)</option>
						<option value="SUPER_ADMIN">SUPER ADMIN (Full system & developer console)</option>
					</select>
				</div>

				<!-- Assign Verticals in Add Modal -->
				{#if addRole === 'SUPER_ADMIN' || addRole === 'ADMIN'}
					<div class="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-300 flex items-center gap-2">
						<Layers class="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
						<p class="text-[11px] font-medium leading-tight">
							<strong>All Verticals Authorized:</strong> Administrators automatically have access to all business verticals and funnels.
						</p>
					</div>
				{:else}
					<div class="space-y-1.5 pt-1">
						<p class="block text-xs font-bold text-slate-700 dark:text-slate-300">Assign Business Verticals</p>
						<p class="text-[11px] text-slate-500">If no vertical is selected, this user will not have access to any leads.</p>
						<div class="space-y-1.5 max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
							{#each (data.verticalsList || []) as vert}
								<label class="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 p-1.5 rounded-lg transition-colors">
									<input
										type="checkbox"
										name="verticalIds"
										value={vert.id}
										checked={addVerticalIds.includes(vert.id)}
										onchange={() => toggleAddVertical(vert.id)}
										class="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer"
									/>
									<span class="font-bold">{vert.name}</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex items-center justify-end gap-3 pt-2">
					<button type="button" onclick={() => (showAddModal = false)} class="btn-secondary text-xs">Cancel</button>
					<button type="submit" class="btn-primary text-xs">Create Account</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Edit User Account Profile & Credentials -->
{#if editUser}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
		<div class="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
					<Edit3 class="w-5 h-5 text-[#1f71c1] dark:text-sky-400" />
					Edit User Profile & Credentials
				</h3>
				<button onclick={closeEditModal} class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
					<X class="w-5 h-5" />
				</button>
			</div>

			<p class="text-xs text-slate-600 dark:text-slate-400">
				Update full name, email address, or password for <strong class="text-sky-700 dark:text-sky-300 font-bold">{editUser.name}</strong>.
			</p>

			<form method="POST" action="?/updateUser" use:enhance={() => {
				return async ({ update }) => {
					closeEditModal();
					update();
				};
			}} class="space-y-3.5">
				<input type="hidden" name="userId" value={editUser.id} />

				<div class="space-y-1">
					<label for="edit-name" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Full Name / Username *</label>
					<input
						id="edit-name"
						name="name"
						type="text"
						required
						bind:value={editName}
						placeholder="Full Name"
						class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#1f71c1] focus:outline-none font-semibold shadow-xs"
					/>
				</div>

				<div class="space-y-1">
					<label for="edit-email" class="block text-xs font-bold text-slate-700 dark:text-slate-300">Email Address *</label>
					<input
						id="edit-email"
						name="email"
						type="email"
						required
						bind:value={editEmail}
						placeholder="user@nbmsinc.com"
						class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#1f71c1] focus:outline-none font-semibold shadow-xs"
					/>
				</div>

				<div class="space-y-1">
					<label for="edit-new-pass" class="block text-xs font-bold text-slate-700 dark:text-slate-300">
						New Password <span class="text-slate-400 font-normal">(Leave blank to keep current)</span>
					</label>
					<input
						id="edit-new-pass"
						name="newPassword"
						type="password"
						bind:value={editNewPassword}
						placeholder="Enter new password (optional)"
						class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-none shadow-xs"
					/>
				</div>

				<!-- Required Dev Authorization: Previous / Current Password -->
				<div class="space-y-1 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/30">
					<label for="edit-current-pass" class="block text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
						<Lock class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
						Enter Dev / Previous Password to Confirm *
					</label>
					<p class="text-[10px] text-slate-500 dark:text-slate-400 mb-1">
						For security, enter your active Dev account password to authorize changes.
					</p>
					<input
						id="edit-current-pass"
						name="currentPassword"
						type="password"
						required
						bind:value={editCurrentPassword}
						placeholder="Your active Dev account password"
						class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-none shadow-xs"
					/>
				</div>

				<!-- Assign Verticals in Edit Modal -->
				{#if editUser?.role === 'SUPER_ADMIN' || editUser?.role === 'ADMIN'}
					<div class="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-300 flex items-center gap-2">
						<Layers class="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
						<p class="text-[11px] font-medium leading-tight">
							<strong>All Verticals Authorized:</strong> Administrators have global visibility across all business verticals.
						</p>
					</div>
				{:else}
					<div class="space-y-1.5 pt-1">
						<input type="hidden" name="hasVerticalsField" value="true" />
						<p class="block text-xs font-bold text-slate-700 dark:text-slate-300">Assigned Business Verticals</p>
						<p class="text-[10px] text-slate-500">Unchecking all verticals will revoke data visibility for this user.</p>
						<div class="space-y-1.5 max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
							{#each (data.verticalsList || []) as vert}
								<label class="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 p-1.5 rounded-lg transition-colors">
									<input
										type="checkbox"
										name="verticalIds"
										value={vert.id}
										checked={assignVerticalIds.includes(vert.id)}
										onchange={() => toggleAssignVertical(vert.id)}
										class="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer"
									/>
									<span class="font-bold">{vert.name}</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex items-center justify-end gap-3 pt-2">
					<button type="button" onclick={closeEditModal} class="btn-secondary text-xs">Cancel</button>
					<button type="submit" class="btn-primary text-xs">Save Account Edits</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Dedicated Assign Business Verticals -->
{#if assignVerticalsUser}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
		<div class="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<h3 class="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
					<Layers class="w-5 h-5 text-sky-600 dark:text-sky-400" />
					Assign Business Verticals
				</h3>
				<button onclick={closeAssignModal} class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
					<X class="w-5 h-5" />
				</button>
			</div>

			<div>
				<p class="text-xs text-slate-600 dark:text-slate-400">
					Configure which market verticals <strong class="text-sky-700 dark:text-sky-300 font-bold">{assignVerticalsUser.name}</strong> can access.
				</p>
				<p class="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-1">
					* If no vertical is assigned, all lead data will be hidden from this user.
				</p>
			</div>

			<form method="POST" action="?/assignVerticals" use:enhance={handleFormEnhance} class="space-y-4">
				<input type="hidden" name="userId" value={assignVerticalsUser.id} />

				<div class="space-y-2 max-h-60 overflow-y-auto p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
					{#each (data.verticalsList || []) as vert}
						<label class="flex items-center justify-between text-xs text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 p-2 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
							<div class="flex items-center gap-2.5">
								<input
									type="checkbox"
									name="verticalIds"
									value={vert.id}
									checked={assignVerticalIds.includes(vert.id)}
									onchange={() => toggleAssignVertical(vert.id)}
									class="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer"
								/>
								<div>
									<p class="font-bold">{vert.name}</p>
									<p class="text-[10px] text-slate-400 font-mono">/{vert.slug}</p>
								</div>
							</div>
						</label>
					{/each}
				</div>

				<div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
					<button type="button" onclick={closeAssignModal} class="btn-secondary text-xs">Cancel</button>
					<button type="submit" class="btn-primary text-xs flex items-center gap-1.5 shadow-md">
						<Layers class="w-3.5 h-3.5" />
						<span>Save Vertical Assignments</span>
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal: Reset Password -->
{#if resetUserId}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
		<div class="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl space-y-4">
			<div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
				<h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
					<KeyRound class="w-5 h-5 text-purple-600 dark:text-purple-400" />
					Reset User Password
				</h3>
				<button onclick={closeResetModal} class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
					<X class="w-5 h-5" />
				</button>
			</div>

			<p class="text-xs text-slate-600 dark:text-slate-400">
				Reset password for user account <strong class="text-purple-700 dark:text-purple-300 font-bold">{resetUserName}</strong>.
			</p>

			<form method="POST" action="?/resetPassword" use:enhance={() => {
				return async ({ update }) => {
					closeResetModal();
					update();
				};
			}} class="space-y-4">
				<input type="hidden" name="userId" value={resetUserId} />

				<div class="space-y-1.5">
					<label for="reset-pass" class="block text-xs font-bold text-slate-700 dark:text-slate-300">New Password *</label>
					<input
						id="reset-pass"
						name="newPassword"
						type="password"
						required
						bind:value={newPasswordInput}
						placeholder="Minimum 6 characters"
						class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-none"
					/>
				</div>

				<!-- Required Dev Authorization: Previous / Current Password -->
				<div class="space-y-1 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/30">
					<label for="reset-current-pass" class="block text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
						<Lock class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
						Enter Dev / Previous Password to Confirm *
					</label>
					<p class="text-[10px] text-slate-500 dark:text-slate-400 mb-1">
						Enter your active Dev account password to confirm password reset.
					</p>
					<input
						id="reset-current-pass"
						name="currentPassword"
						type="password"
						required
						placeholder="Your active Dev account password"
						class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-purple-600 focus:outline-none shadow-xs"
					/>
				</div>

				<div class="flex items-center justify-end gap-3 pt-2">
					<button type="button" onclick={closeResetModal} class="btn-secondary text-xs cursor-pointer">Cancel</button>
					<button type="submit" class="btn-primary text-xs cursor-pointer">Update Password</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<ConfirmModal
	bind:isOpen={isDeleteUserConfirmOpen}
	title="Delete User Account?"
	message={`Are you sure you want to permanently delete the user account for ${userToDeleteName}?`}
	confirmText="Delete Account"
	variant="danger"
	onConfirm={confirmDeleteUser}
/>
