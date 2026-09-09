import { db } from '$lib/server/db';
import { leads, contracts, emailLogs } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request, url }) => {
	const host =
		request.headers.get('x-forwarded-host') ||
		request.headers.get('host') ||
		url.hostname ||
		'';

	const isDispensarySubdomain =
		host.startsWith('dispensary.') || host.includes('dispensary.payjeezy.com');

	// If accessing dispensary.payjeezy.com at root "/", redirect immediately to the public intake landing page (/funnel)
	if (isDispensarySubdomain) {
		throw redirect(302, '/funnel');
	}

	const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
	const recentContracts = await db.select().from(contracts).orderBy(desc(contracts.createdAt)).limit(5);
	const recentEmailLogs = await db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt)).limit(5);

	// Calculate funnel metrics
	const totalCount = allLeads.length;
	const newCount = allLeads.filter((l) => l.status === 'NEW').length;
	const emailedCount = allLeads.filter((l) => l.status === 'EMAILED').length;
	const contactedCount = allLeads.filter((l) => l.status === 'CONTACTED').length;
	const contractSentCount = allLeads.filter((l) => l.status === 'CONTRACT_SENT').length;
	const signedCount = allLeads.filter((l) => l.status === 'CONTRACT_SIGNED').length;

	// Calculate conversion rate
	const conversionRate = totalCount > 0 ? Math.round((signedCount / totalCount) * 100) : 0;

	return {
		leads: allLeads.slice(0, 8),
		totalCount,
		newCount,
		emailedCount,
		contactedCount,
		contractSentCount,
		signedCount,
		conversionRate,
		recentContracts,
		recentEmailLogs
	};
};
