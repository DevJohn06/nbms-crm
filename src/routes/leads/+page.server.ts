import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { upsertOrCollateLead, processLeadBatch, deduplicateDatabaseLeads } from '$lib/server/leads';

export const load: PageServerLoad = async ({ url }) => {
	// Auto-clean any pre-existing duplicate lead entries on load
	try {
		await deduplicateDatabaseLeads();
	} catch (err) {
		console.error('Error auto-cleaning duplicate leads:', err);
	}

	const searchQuery = url.searchParams.get('q') || '';
	const statusFilter = url.searchParams.get('status') || '';

	const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));

	let filtered = allLeads;
	if (searchQuery) {
		const q = searchQuery.toLowerCase();
		filtered = filtered.filter(
			(l) =>
				l.businessName.toLowerCase().includes(q) ||
				l.email.toLowerCase().includes(q) ||
				l.phone.toLowerCase().includes(q)
		);
	}
	if (statusFilter && statusFilter !== 'ALL') {
		filtered = filtered.filter((l) => l.status === statusFilter);
	}

	return {
		leads: filtered,
		totalLeads: allLeads.length,
		searchQuery,
		statusFilter
	};
};

export const actions: Actions = {
	createLead: async ({ request }) => {
		const formData = await request.formData();
		const businessName = formData.get('businessName')?.toString().trim();
		const email = formData.get('email')?.toString().trim();
		const phone = formData.get('phone')?.toString().trim();
		const status = formData.get('status')?.toString() || 'NEW';
		const notes = formData.get('notes')?.toString() || '';

		if (!businessName || !email || !phone) {
			return fail(400, { error: 'Business Name, Email, and Phone are required.' });
		}

		try {
			const res = await upsertOrCollateLead({
				businessName,
				email,
				phone,
				status,
				notes
			});

			const msg =
				res.action === 'collated'
					? `Lead "${businessName}" already exists. Contact information has been merged into the existing lead.`
					: `Lead "${businessName}" added successfully.`;

			return { success: true, message: msg };
		} catch (err: any) {
			return fail(400, { error: err.message || 'Failed to save lead.' });
		}
	},

	importBatch: async ({ request }) => {
		const formData = await request.formData();
		const rawJson = formData.get('leadsJson')?.toString();

		if (!rawJson) {
			return fail(400, { error: 'No lead data provided.' });
		}

		try {
			const parsedLeads: Array<{ businessName: string; email: string; phone: string; status?: string; notes?: string }> = JSON.parse(rawJson);

			if (!Array.isArray(parsedLeads) || parsedLeads.length === 0) {
				return fail(400, { error: 'Invalid lead array' });
			}

			const stats = await processLeadBatch(parsedLeads);

			return {
				success: true,
				count: stats.totalProcessed,
				createdCount: stats.createdCount,
				collatedCount: stats.collatedCount
			};
		} catch (err) {
			console.error('Batch import error:', err);
			return fail(400, { error: 'Failed to process lead import batch.' });
		}
	},

	deduplicate: async () => {
		try {
			const stats = await deduplicateDatabaseLeads();
			return { success: true, cleaned: stats.cleaned };
		} catch (err: any) {
			return fail(400, { error: 'Failed to clean duplicate database leads.' });
		}
	},

	updateStatus: async ({ request }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const newStatus = formData.get('status')?.toString();

		if (!id || !newStatus) {
			return fail(400, { error: 'Lead ID and new status required.' });
		}

		const now = new Date().toISOString();
		await db
			.update(leads)
			.set({ status: newStatus, updatedAt: now })
			.where(eq(leads.id, id));

		return { success: true };
	},

	deleteLead: async ({ request }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		if (!id) return fail(400, { error: 'Lead ID required' });

		await db.delete(leads).where(eq(leads.id, id));
		return { success: true };
	}
};
