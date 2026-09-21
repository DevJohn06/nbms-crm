import { db } from '$lib/server/db';
import { leads, contracts, emailLogs } from '$lib/server/db/schema';
import { desc, inArray, eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAccessibleVerticalIds } from '$lib/server/verticals';

export const load: PageServerLoad = async ({ request, url, locals }) => {
	const host =
		request.headers.get('x-forwarded-host') ||
		request.headers.get('host') ||
		url.hostname ||
		'';

	const isDispensarySubdomain =
		host.startsWith('dispensary.') ||
		host.includes('dispensary.nbmsinc.com');

	// If accessing dispensary subdomain at root "/", redirect immediately to the public intake landing page (/funnel)
	if (isDispensarySubdomain) {
		throw redirect(302, '/funnel');
	}

	const user = locals.user;
	const verticalFilter = url.searchParams.get('vertical') || null;

	// Determine accessible verticals
	const accessibleVerticalIds = await getAccessibleVerticalIds(user);

	// RULE: If no vertical assigned, data is not visible to this user
	if (!user || accessibleVerticalIds.length === 0) {
		return {
			noVerticalsAssigned: true,
			leads: [],
			totalCount: 0,
			newCount: 0,
			emailedCount: 0,
			contactedCount: 0,
			contractSentCount: 0,
			signedCount: 0,
			conversionRate: 0,
			recentContracts: [],
			recentEmailLogs: [],
			activeVertical: verticalFilter
		};
	}

	// Filter down by requested vertical if accessible
	let targetVerticalIds = accessibleVerticalIds;
	if (verticalFilter) {
		if (accessibleVerticalIds.includes(verticalFilter) || user.role === 'SUPER_ADMIN') {
			targetVerticalIds = [verticalFilter];
		}
	}

	const allLeads = await db
		.select()
		.from(leads)
		.where(inArray(leads.verticalId, targetVerticalIds))
		.orderBy(desc(leads.createdAt));

	const recentContracts = await db
		.select({
			id: contracts.id,
			leadId: contracts.leadId,
			clientName: contracts.clientName,
			clientEmail: contracts.clientEmail,
			servicePackage: contracts.servicePackage,
			monthlyFee: contracts.monthlyFee,
			status: contracts.status,
			createdAt: contracts.createdAt
		})
		.from(contracts)
		.innerJoin(leads, eq(contracts.leadId, leads.id))
		.where(inArray(leads.verticalId, targetVerticalIds))
		.orderBy(desc(contracts.createdAt))
		.limit(5);

	const recentEmailLogs = await db
		.select({
			id: emailLogs.id,
			leadId: emailLogs.leadId,
			recipient: emailLogs.recipient,
			subject: emailLogs.subject,
			status: emailLogs.status,
			sentAt: emailLogs.sentAt
		})
		.from(emailLogs)
		.innerJoin(leads, eq(emailLogs.leadId, leads.id))
		.where(inArray(leads.verticalId, targetVerticalIds))
		.orderBy(desc(emailLogs.sentAt))
		.limit(5);

	// Calculate funnel metrics for active vertical context
	const totalCount = allLeads.length;
	const newCount = allLeads.filter((l) => l.status === 'NEW').length;
	const emailedCount = allLeads.filter((l) => l.status === 'EMAILED').length;
	const contactedCount = allLeads.filter((l) => l.status === 'CONTACTED').length;
	const contractSentCount = allLeads.filter((l) => l.status === 'CONTRACT_SENT').length;
	const signedCount = allLeads.filter((l) => l.status === 'CONTRACT_SIGNED').length;

	// Calculate conversion rate
	const conversionRate = totalCount > 0 ? Math.round((signedCount / totalCount) * 100) : 0;

	return {
		noVerticalsAssigned: false,
		leads: allLeads.slice(0, 8),
		totalCount,
		newCount,
		emailedCount,
		contactedCount,
		contractSentCount,
		signedCount,
		conversionRate,
		recentContracts,
		recentEmailLogs,
		activeVertical: verticalFilter
	};
};
