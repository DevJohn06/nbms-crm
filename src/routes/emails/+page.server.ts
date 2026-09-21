import { db } from '$lib/server/db';
import { emailLogs, leads, emailTemplates, verticals } from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { getAccessibleVerticalIds } from '$lib/server/verticals';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	const accessibleVerticalIds = await getAccessibleVerticalIds(user);

	const templates = await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));

	if (!user || accessibleVerticalIds.length === 0) {
		return {
			logs: [],
			templates,
			leads: [],
			noVerticalsAssigned: true
		};
	}

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
			businessName: leads.businessName,
			verticalId: leads.verticalId,
			verticalName: verticals.name
		})
		.from(emailLogs)
		.innerJoin(leads, eq(emailLogs.leadId, leads.id))
		.leftJoin(verticals, eq(leads.verticalId, verticals.id))
		.where(inArray(leads.verticalId, accessibleVerticalIds))
		.orderBy(desc(emailLogs.sentAt));

	const scopedLeads = await db
		.select()
		.from(leads)
		.where(inArray(leads.verticalId, accessibleVerticalIds))
		.orderBy(desc(leads.createdAt));

	return {
		logs,
		templates,
		leads: scopedLeads,
		noVerticalsAssigned: false
	};
};
