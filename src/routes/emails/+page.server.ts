import { db } from '$lib/server/db';
import { emailLogs, leads, emailTemplates } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const logs = await db
		.select({
			id: emailLogs.id,
			leadId: emailLogs.leadId,
			sender: emailLogs.sender,
			recipient: emailLogs.recipient,
			subject: emailLogs.subject,
			bodyHtml: emailLogs.bodyHtml,
			status: emailLogs.status,
			direction: emailLogs.direction,
			sentAt: emailLogs.sentAt,
			businessName: leads.businessName
		})
		.from(emailLogs)
		.leftJoin(leads, eq(emailLogs.leadId, leads.id))
		.orderBy(desc(emailLogs.sentAt));

	const templates = await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
	const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));

	return {
		logs,
		templates,
		leads: allLeads
	};
};
