import { db } from '$lib/server/db';
import { bookedCalls, verticals } from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getAccessibleVerticalIds, getAllVerticals, getUserAssignedVerticals } from '$lib/server/verticals';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	const accessibleVerticalIds = await getAccessibleVerticalIds(user);
	const verticalFilter = url.searchParams.get('vertical') || '';

	const availableVerticals = user?.role === 'SUPER_ADMIN'
		? await getAllVerticals()
		: user
			? await getUserAssignedVerticals(user.id)
			: [];

	if (!user || accessibleVerticalIds.length === 0) {
		return {
			callsList: [],
			noVerticalsAssigned: true,
			availableVerticals: [],
			verticalFilter
		};
	}

	let targetVerticalIds = accessibleVerticalIds;
	if (verticalFilter && verticalFilter !== 'ALL') {
		if (accessibleVerticalIds.includes(verticalFilter) || user.role === 'SUPER_ADMIN') {
			targetVerticalIds = [verticalFilter];
		}
	}

	try {
		const callsList = await db
			.select({
				id: bookedCalls.id,
				leadId: bookedCalls.leadId,
				verticalId: bookedCalls.verticalId,
				clientName: bookedCalls.clientName,
				clientEmail: bookedCalls.clientEmail,
				clientPhone: bookedCalls.clientPhone,
				businessName: bookedCalls.businessName,
				callDate: bookedCalls.callDate,
				meetingType: bookedCalls.meetingType,
				notes: bookedCalls.notes,
				status: bookedCalls.status,
				createdAt: bookedCalls.createdAt,
				verticalName: verticals.name
			})
			.from(bookedCalls)
			.leftJoin(verticals, eq(bookedCalls.verticalId, verticals.id))
			.where(inArray(bookedCalls.verticalId, targetVerticalIds))
			.orderBy(desc(bookedCalls.callDate));

		return {
			callsList: callsList || [],
			noVerticalsAssigned: false,
			availableVerticals,
			verticalFilter
		};
	} catch (err) {
		console.error('Error querying booked calls:', err);
		return {
			callsList: [],
			noVerticalsAssigned: false,
			availableVerticals,
			verticalFilter
		};
	}
};

export const actions: Actions = {
	updateCallStatus: async ({ request }) => {
		const formData = await request.formData();
		const callId = Number(formData.get('callId'));
		const newStatus = formData.get('status')?.toString();

		if (!callId || !newStatus) {
			return fail(400, { error: 'Call ID and new status required.' });
		}

		await db
			.update(bookedCalls)
			.set({ status: newStatus })
			.where(eq(bookedCalls.id, callId));

		return { success: true };
	},

	createManualCall: async ({ request, locals }) => {
		const user = locals.user;
		const accessibleVerticalIds = await getAccessibleVerticalIds(user);
		if (!user || accessibleVerticalIds.length === 0) {
			return fail(403, { error: 'No vertical assigned.' });
		}

		const formData = await request.formData();
		const clientName = formData.get('clientName')?.toString().trim();
		const clientEmail = formData.get('clientEmail')?.toString().trim();
		const clientPhone = formData.get('clientPhone')?.toString().trim();
		const businessName = formData.get('businessName')?.toString().trim();
		const callDate = formData.get('callDate')?.toString().trim();
		const meetingType = formData.get('meetingType')?.toString().trim() || 'Merchant Strategy Session';
		const notes = formData.get('notes')?.toString().trim();
		let verticalId = formData.get('verticalId')?.toString().trim();

		if (!verticalId || (!accessibleVerticalIds.includes(verticalId) && user.role !== 'SUPER_ADMIN')) {
			verticalId = accessibleVerticalIds[0];
		}

		if (!clientName || !clientEmail || !callDate) {
			return fail(400, { error: 'Client name, email, and date required.' });
		}

		const now = new Date().toISOString();
		await db.insert(bookedCalls).values({
			verticalId,
			clientName,
			clientEmail,
			clientPhone: clientPhone || null,
			businessName: businessName || null,
			callDate,
			meetingType,
			notes: notes || null,
			status: 'SCHEDULED',
			createdAt: now
		});

		return { success: true };
	},

	bookCall: async (event) => {
		return (actions.createManualCall as any)(event);
	},

	deleteCall: async ({ request }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		if (!id) return fail(400, { error: 'Call ID required.' });
		await db.delete(bookedCalls).where(eq(bookedCalls.id, id));
		return { success: true };
	}
};
