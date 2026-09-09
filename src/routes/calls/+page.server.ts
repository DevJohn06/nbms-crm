import { db } from '$lib/server/db';
import { bookedCalls, leads } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	try {
		const callsList = await db
			.select({
				id: bookedCalls.id,
				leadId: bookedCalls.leadId,
				clientName: bookedCalls.clientName,
				clientEmail: bookedCalls.clientEmail,
				clientPhone: bookedCalls.clientPhone,
				businessName: bookedCalls.businessName,
				callDate: bookedCalls.callDate,
				meetingType: bookedCalls.meetingType,
				notes: bookedCalls.notes,
				status: bookedCalls.status,
				createdAt: bookedCalls.createdAt
			})
			.from(bookedCalls)
			.orderBy(desc(bookedCalls.callDate));

		return {
			callsList: callsList || []
		};
	} catch (err) {
		console.error('Error querying booked calls:', err);
		return {
			callsList: []
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

	createManualCall: async ({ request }) => {
		const formData = await request.formData();
		const clientName = formData.get('clientName')?.toString().trim();
		const clientEmail = formData.get('clientEmail')?.toString().trim();
		const clientPhone = formData.get('clientPhone')?.toString().trim();
		const businessName = formData.get('businessName')?.toString().trim();
		const callDate = formData.get('callDate')?.toString().trim();
		const meetingType = formData.get('meetingType')?.toString().trim() || 'Merchant Strategy Session';
		const notes = formData.get('notes')?.toString().trim();

		if (!clientName || !clientEmail || !callDate) {
			return fail(400, { error: 'Client name, email, and date required.' });
		}

		const now = new Date().toISOString();
		await db.insert(bookedCalls).values({
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
	}
};
