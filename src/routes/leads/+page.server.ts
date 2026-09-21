import { db } from '$lib/server/db';
import { leads, verticals } from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { upsertOrCollateLead, processLeadBatch, deduplicateDatabaseLeads } from '$lib/server/leads';
import { getAccessibleVerticalIds, getAllVerticals, getUserAssignedVerticals } from '$lib/server/verticals';

export const load: PageServerLoad = async ({ url, locals }) => {
	const user = locals.user;

	// Auto-clean any pre-existing duplicate lead entries on load
	try {
		await deduplicateDatabaseLeads();
	} catch (err) {
		console.error('Error auto-cleaning duplicate leads:', err);
	}

	const searchQuery = url.searchParams.get('q') || '';
	const statusFilter = url.searchParams.get('status') || '';
	const verticalFilter = url.searchParams.get('vertical') || '';

	// Determine accessible verticals
	const accessibleVerticalIds = await getAccessibleVerticalIds(user);

	// Fetch available verticals for the filter dropdown
	const availableVerticals = user?.role === 'SUPER_ADMIN'
		? await getAllVerticals()
		: user
			? await getUserAssignedVerticals(user.id)
			: [];

	// RULE: If user has no vertical assigned, return empty list with noVerticalsAssigned: true
	if (!user || accessibleVerticalIds.length === 0) {
		return {
			leads: [],
			totalLeads: 0,
			noVerticalsAssigned: true,
			searchQuery,
			statusFilter,
			verticalFilter,
			availableVerticals: []
		};
	}

	// Filter down by requested vertical if accessible
	let targetVerticalIds = accessibleVerticalIds;
	if (verticalFilter && verticalFilter !== 'ALL') {
		if (accessibleVerticalIds.includes(verticalFilter) || user.role === 'SUPER_ADMIN') {
			targetVerticalIds = [verticalFilter];
		}
	}

	// Query scoped leads with vertical details
	const allLeads = await db
		.select({
			id: leads.id,
			verticalId: leads.verticalId,
			businessName: leads.businessName,
			email: leads.email,
			phone: leads.phone,
			status: leads.status,
			notes: leads.notes,
			customFields: leads.customFields,
			createdAt: leads.createdAt,
			updatedAt: leads.updatedAt,
			verticalName: verticals.name
		})
		.from(leads)
		.leftJoin(verticals, eq(leads.verticalId, verticals.id))
		.where(inArray(leads.verticalId, targetVerticalIds))
		.orderBy(desc(leads.createdAt));

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
		noVerticalsAssigned: false,
		searchQuery,
		statusFilter,
		verticalFilter,
		availableVerticals
	};
};

export const actions: Actions = {
	createLead: async ({ request, locals }) => {
		const user = locals.user;
		const accessibleVerticalIds = await getAccessibleVerticalIds(user);
		if (!user || accessibleVerticalIds.length === 0) {
			return fail(403, { error: 'You do not have permission to add leads (no vertical assigned).' });
		}

		const formData = await request.formData();
		const businessName = formData.get('businessName')?.toString().trim();
		const email = formData.get('email')?.toString().trim();
		const phone = formData.get('phone')?.toString().trim();
		const status = formData.get('status')?.toString() || 'NEW';
		const notes = formData.get('notes')?.toString() || '';
		let verticalId = formData.get('verticalId')?.toString().trim();

		// Default to first accessible vertical if not specified or invalid
		if (!verticalId || (!accessibleVerticalIds.includes(verticalId) && user.role !== 'SUPER_ADMIN')) {
			verticalId = accessibleVerticalIds[0];
		}

		if (!businessName || !email || !phone) {
			return fail(400, { error: 'Business Name, Email, and Phone are required.' });
		}

		try {
			const res = await upsertOrCollateLead({
				businessName,
				email,
				phone,
				status,
				notes,
				verticalId
			});

			const msg =
				res.action === 'collated'
					? `Lead "${businessName}" already exists in this vertical. Contact information merged.`
					: `Lead "${businessName}" added successfully.`;

			return { success: true, message: msg };
		} catch (err: any) {
			return fail(400, { error: err.message || 'Failed to save lead.' });
		}
	},

	importBatch: async ({ request, locals }) => {
		const user = locals.user;
		const accessibleVerticalIds = await getAccessibleVerticalIds(user);
		if (!user || accessibleVerticalIds.length === 0) {
			return fail(403, { error: 'You do not have permission to import leads (no vertical assigned).' });
		}

		const formData = await request.formData();
		const rawJson = formData.get('leadsJson')?.toString();
		let targetVerticalId = formData.get('verticalId')?.toString().trim();

		if (!targetVerticalId || (!accessibleVerticalIds.includes(targetVerticalId) && user.role !== 'SUPER_ADMIN')) {
			targetVerticalId = accessibleVerticalIds[0];
		}

		if (!rawJson) {
			return fail(400, { error: 'No lead data provided.' });
		}

		try {
			const parsedLeads: Array<{ businessName: string; email: string; phone: string; status?: string; notes?: string }> = JSON.parse(rawJson);

			if (!Array.isArray(parsedLeads) || parsedLeads.length === 0) {
				return fail(400, { error: 'Invalid lead array' });
			}

			const stats = await processLeadBatch(parsedLeads, targetVerticalId);

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

	updateLeadVertical: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Unauthorized' });

		const formData = await request.formData();
		const leadId = Number(formData.get('leadId'));
		const newVerticalId = formData.get('verticalId')?.toString().trim();

		if (!leadId || !newVerticalId) {
			return fail(400, { error: 'Lead ID and Vertical ID required.' });
		}

		const now = new Date().toISOString();
		await db
			.update(leads)
			.set({ verticalId: newVerticalId, updatedAt: now })
			.where(eq(leads.id, leadId));

		return { success: true, message: 'Lead vertical updated successfully.' };
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
