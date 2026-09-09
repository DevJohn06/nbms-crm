import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { emailLogs, leads } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const leadId = url.searchParams.get('leadId');

	if (leadId) {
		const logs = await db
			.select()
			.from(emailLogs)
			.where(eq(emailLogs.leadId, Number(leadId)))
			.orderBy(desc(emailLogs.sentAt));
		return json(logs);
	}

	const logs = await db
		.select({
			log: emailLogs,
			leadBusinessName: leads.businessName
		})
		.from(emailLogs)
		.leftJoin(leads, eq(emailLogs.leadId, leads.id))
		.orderBy(desc(emailLogs.sentAt))
		.limit(50);

	return json(logs);
};
