import { error, json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { contracts, leads } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const contractId = body.contractId?.toString();
		const leadId = Number(body.leadId);
		const newStatus = body.status?.toString();

		if (!newStatus || !['SIGNED', 'PENDING_SIGNATURE', 'DRAFT'].includes(newStatus)) {
			throw error(400, 'Valid status ("SIGNED", "PENDING_SIGNATURE", "DRAFT") is required.');
		}

		let targetContract;
		if (contractId) {
			[targetContract] = await db.select().from(contracts).where(eq(contracts.id, contractId));
		} else if (leadId && !isNaN(leadId)) {
			[targetContract] = await db.select().from(contracts).where(eq(contracts.leadId, leadId));
		}

		if (!targetContract) {
			throw error(404, 'Contract not found.');
		}

		const now = new Date().toISOString();
		const isSigned = newStatus === 'SIGNED';

		const [updatedContract] = await db
			.update(contracts)
			.set({
				status: newStatus,
				signedAt: isSigned ? (targetContract.signedAt || now) : null
			})
			.where(eq(contracts.id, targetContract.id))
			.returning();

		// Update linked lead status accordingly
		await db
			.update(leads)
			.set({
				status: isSigned ? 'CONTRACT_SIGNED' : 'CONTRACT_SENT',
				updatedAt: now
			})
			.where(eq(leads.id, targetContract.leadId));

		return json({
			success: true,
			contract: updatedContract
		});
	} catch (err: any) {
		console.error('Failed to update contract status:', err);
		throw error(500, err?.message || 'Failed to update contract status.');
	}
};
