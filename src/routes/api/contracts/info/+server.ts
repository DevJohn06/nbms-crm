import { error, json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { contracts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const leadId = Number(url.searchParams.get('leadId'));
	if (!leadId || isNaN(leadId)) {
		throw error(400, 'Valid leadId parameter is required');
	}

	const [contract] = await db
		.select()
		.from(contracts)
		.where(eq(contracts.leadId, leadId));

	return json(contract || null);
};
