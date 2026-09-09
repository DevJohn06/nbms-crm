import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { id, notes } = await request.json();
		if (!id) {
			return json({ error: 'Lead ID required' }, { status: 400 });
		}

		const now = new Date().toISOString();
		await db
			.update(leads)
			.set({ notes: notes || '', updatedAt: now })
			.where(eq(leads.id, id));

		return json({ success: true });
	} catch (e: any) {
		return json({ error: e.message || 'Failed to update lead notes' }, { status: 500 });
	}
};
