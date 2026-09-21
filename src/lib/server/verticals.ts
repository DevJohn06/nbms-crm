import { db } from '$lib/server/db';
import { verticals, userVerticals, leads, users, intakeCms } from '$lib/server/db/schema';
import { eq, desc, inArray, sql } from 'drizzle-orm';

export interface VerticalRecord {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	subdomain: string | null;
	themeColor: string | null;
	isDefault: number | null;
	createdAt: string;
	updatedAt: string;
	leadsCount?: number;
	assignedUsersCount?: number;
	assignedUsers?: Array<{ id: string; name: string; email: string; role: string }>;
}

export function slugify(text: string): string {
	return text
		.toString()
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w\-]+/g, '')
		.replace(/\-\-+/g, '-')
		.replace(/^-+/, '')
		.replace(/-+$/, '');
}

/**
 * Fetch all business verticals, optionally enriched with lead and user assignment counts.
 */
export async function getAllVerticals(): Promise<VerticalRecord[]> {
	const all = await db.select().from(verticals).orderBy(verticals.name);

	// Get lead counts per vertical
	const leadCounts = await db
		.select({
			verticalId: leads.verticalId,
			count: sql<number>`count(*)`
		})
		.from(leads)
		.groupBy(leads.verticalId);

	const leadCountMap = new Map<string, number>();
	for (const row of leadCounts) {
		if (row.verticalId) leadCountMap.set(row.verticalId, Number(row.count));
	}

	// Get assigned users per vertical
	const assignments = await db
		.select({
			verticalId: userVerticals.verticalId,
			userId: users.id,
			userName: users.name,
			userEmail: users.email,
			userRole: users.role
		})
		.from(userVerticals)
		.innerJoin(users, eq(userVerticals.userId, users.id));

	const assignedUsersMap = new Map<string, Array<{ id: string; name: string; email: string; role: string }>>();
	for (const row of assignments) {
		const list = assignedUsersMap.get(row.verticalId) || [];
		list.push({
			id: row.userId,
			name: row.userName,
			email: row.userEmail,
			role: row.userRole
		});
		assignedUsersMap.set(row.verticalId, list);
	}

	return all.map((v) => {
		const assigned = assignedUsersMap.get(v.id) || [];
		return {
			...v,
			leadsCount: leadCountMap.get(v.id) || 0,
			assignedUsersCount: assigned.length,
			assignedUsers: assigned
		};
	});
}

/**
 * Find vertical by ID or Slug.
 */
export async function getVerticalBySlug(slugOrId: string): Promise<VerticalRecord | null> {
	if (!slugOrId) return null;
	const norm = slugOrId.trim().toLowerCase();

	const [found] = await db
		.select()
		.from(verticals)
		.where(sql`lower(${verticals.slug}) = ${norm} OR lower(${verticals.id}) = ${norm}`);

	return found || null;
}

/**
 * Create a new vertical and initialize default landing page CMS sections.
 */
export async function createVertical(data: {
	name: string;
	slug?: string;
	description?: string;
	subdomain?: string;
	themeColor?: string;
}): Promise<VerticalRecord> {
	const rawName = data.name.trim();
	if (!rawName) throw new Error('Vertical name is required.');

	const slug = slugify(data.slug || rawName);
	if (!slug) throw new Error('Valid URL slug is required.');

	// Check slug uniqueness
	const existing = await getVerticalBySlug(slug);
	if (existing) {
		throw new Error(`Vertical with slug "${slug}" already exists.`);
	}

	const now = new Date().toISOString();
	const id = slug;

	const [created] = await db
		.insert(verticals)
		.values({
			id,
			name: rawName,
			slug,
			description: data.description?.trim() || null,
			subdomain: data.subdomain?.trim().toLowerCase() || null,
			themeColor: data.themeColor || null,
			isDefault: 0,
			createdAt: now,
			updatedAt: now
		})
		.returning();

	// Seed default Intake CMS sections for this new vertical so its landing page is instantly live
	try {
		const defaultSections = [
			{
				sectionId: 'hero',
				title: `${rawName} Payment Processing Solutions`,
				subtitle: 'Fast Approvals, State-of-the-Art Terminals & Transparent Processing',
				content: {
					badge: `${rawName} Payment Processing`,
					tagline: 'SPECIALIZED HIGH-RISK & RETAIL SOLUTIONS',
					primaryCta: 'Get Info',
					secondaryCta: 'Book A Call',
					badges: ['Next-Day Funding', 'Zero Processing Fee Options', 'PCI Compliant']
				}
			},
			{
				sectionId: 'process_flow',
				title: `How Payment Processing Works for ${rawName}`,
				subtitle: `Tailored merchant accounts designed specifically for ${rawName} businesses. Simple onboarding, low fees, and reliable POS technology.`,
				content: {
					primaryCta: 'Get Info',
					secondaryCta: 'Book A Call',
					keyPoints: [
						{
							badge: 'High Approval Rate',
							title: `Specialized ${rawName} Merchant Placement`,
							desc: 'Never worry about sudden account freezes or arbitrary processing holds.',
							tag: '99% Approval Rating'
						},
						{
							badge: 'Next-Day Settlements',
							title: 'Automated Daily Direct Bank Deposits',
							desc: 'Funds settle smoothly into your commercial checking account every business morning.',
							tag: 'Real-Time ACH'
						},
						{
							badge: 'Zero Merchant Fees',
							title: 'Pin Debit & Cashless Solutions',
							desc: 'Drastically reduce merchant card processing fees while offering frictionless checkouts.',
							tag: 'Save Thousands Monthly'
						}
					]
				}
			},
			{
				sectionId: 'about',
				title: `Why Choose NBMS for ${rawName}?`,
				subtitle: `Industry-leading payment technology, dedicated underwriting, and 24/7 client support.`,
				content: {
					description: `At NBMS, we understand the operational challenges faced by ${rawName} merchants. Many traditional processors decline or impose excessive reserve requirements. We deliver reliable, secure terminal hardware and transparent rates so your business can flourish without payment interruptions.`,
					transitionNotice: 'Have questions about setting up your account? Contact our team anytime.'
				}
			},
			{
				sectionId: 'how_it_works',
				title: 'Terminal Hardware & Mobility Solutions',
				subtitle: 'Next-generation EMV, contactless tap, and PIN-secured payment hardware.',
				content: {
					hideSection: false,
					features: [
						{ title: 'Countertop & Wireless Terminals', desc: 'Sleek Wi-Fi and 4G LTE connected units for counters or mobile checkout.' },
						{ title: 'Tap, Chip & PIN Ready', desc: 'Supports Apple Pay, Google Pay, and all major debit/credit card types.' },
						{ title: 'Zero Merchant Processing Fees', desc: 'Convenience fee and cash discount options available to eliminate processing costs.' },
						{ title: 'Live Merchant Dashboard', desc: 'Real-time online portal tracking daily batches, sales volume, and customer receipts.' }
					]
				}
			},
			{
				sectionId: 'contact',
				title: 'Specialized Merchant Advisory & Support',
				subtitle: 'Our dedicated underwriting team is ready to assist your onboarding.',
				content: {
					hideSection: false,
					email: 'sales@nbmsinc.com',
					phone: '(877) 817-2257',
					hours: 'Mon - Sun: 24/7 Support Desk',
					helpNotice: `Ready to get started with ${rawName} processing? Reach out to our underwriting team today.`
				}
			},
			{
				sectionId: 'faqs',
				title: 'Frequently Asked Questions',
				subtitle: `Common questions regarding merchant accounts, approval times, and terminal setup for ${rawName}.`,
				content: {
					hideSection: false,
					items: [
						{
							question: `How quickly can my ${rawName} business get approved?`,
							answer: 'Most applications are underwritten and approved within 24 to 48 business hours with standard KYC documentation.'
						},
						{
							question: 'When are funds deposited into my business bank account?',
							answer: 'Settlements are executed daily with standard next-business-day direct deposits into your checking account.'
						},
						{
							question: 'What terminal hardware is provided?',
							answer: 'We provide pre-programmed, out-of-the-box EMV chip and tap enabled terminals with 1-year replacement warranty.'
						}
					]
				}
			},
			{
				sectionId: 'footer',
				title: 'Footer Section',
				subtitle: 'Footer banner and copyright.',
				content: {
					ctaBanner: {
						title: `Ready to Elevate Your ${rawName} Processing?`,
						subtitle: 'Get an instant customized rate quote or book a strategy session with our payment consultants today.',
						primaryCta: 'Get Info',
						secondaryCta: 'Book A Call'
					},
					copyright: '© 2026 NBMS INC. All rights reserved.'
				}
			}
		];

		for (const section of defaultSections) {
			const compoundId = `${id}__${section.sectionId}`;
			await db
				.insert(intakeCms)
				.values({
					id: compoundId,
					verticalId: id,
					sectionId: section.sectionId,
					title: section.title,
					subtitle: section.subtitle,
					contentJson: JSON.stringify(section.content),
					updatedAt: now
				})
				.onConflictDoNothing();
		}
	} catch (cmsErr) {
		console.error(`Failed to initialize CMS sections for new vertical "${id}":`, cmsErr);
	}

	return created;
}

/**
 * Update an existing vertical.
 */
export async function updateVertical(
	id: string,
	data: {
		name?: string;
		description?: string;
		subdomain?: string;
		themeColor?: string;
	}
): Promise<VerticalRecord> {
	const now = new Date().toISOString();
	const updatePayload: Record<string, any> = {
		updatedAt: now
	};

	if (data.name !== undefined) updatePayload.name = data.name.trim();
	if (data.description !== undefined) updatePayload.description = data.description.trim() || null;
	if (data.subdomain !== undefined) updatePayload.subdomain = data.subdomain.trim().toLowerCase() || null;
	if (data.themeColor !== undefined) updatePayload.themeColor = data.themeColor || null;

	const [updated] = await db
		.update(verticals)
		.set(updatePayload)
		.where(eq(verticals.id, id))
		.returning();

	if (!updated) throw new Error('Vertical not found');
	return updated;
}

/**
 * Delete a vertical.
 * Prevents deleting a vertical with associated leads.
 */
export async function deleteVertical(id: string): Promise<void> {
	const [target] = await db.select().from(verticals).where(eq(verticals.id, id));
	if (!target) throw new Error('Vertical not found.');

	// Check if leads exist
	const [leadCheck] = await db
		.select({ count: sql<number>`count(*)` })
		.from(leads)
		.where(eq(leads.verticalId, id));

	if (Number(leadCheck?.count || 0) > 0) {
		throw new Error(`Cannot delete vertical "${target.name}" because it contains ${leadCheck.count} leads.`);
	}

	// Delete user assignments
	await db.delete(userVerticals).where(eq(userVerticals.verticalId, id));

	// Delete CMS sections
	await db.delete(intakeCms).where(eq(intakeCms.verticalId, id));

	// Delete vertical record
	await db.delete(verticals).where(eq(verticals.id, id));
}

/**
 * Get all verticals assigned to a specific user.
 */
export async function getUserAssignedVerticals(userId: string): Promise<VerticalRecord[]> {
	if (!userId) return [];

	const rows = await db
		.select({
			id: verticals.id,
			name: verticals.name,
			slug: verticals.slug,
			description: verticals.description,
			subdomain: verticals.subdomain,
			themeColor: verticals.themeColor,
			isDefault: verticals.isDefault,
			createdAt: verticals.createdAt,
			updatedAt: verticals.updatedAt
		})
		.from(userVerticals)
		.innerJoin(verticals, eq(userVerticals.verticalId, verticals.id))
		.where(eq(userVerticals.userId, userId))
		.orderBy(verticals.name);

	return rows;
}

/**
 * Set/replace assigned verticals for a user.
 */
export async function setUserAssignedVerticals(userId: string, verticalIds: string[]): Promise<void> {
	if (!userId) return;

	// Delete existing assignments
	await db.delete(userVerticals).where(eq(userVerticals.userId, userId));

	// Filter unique valid IDs
	const uniqueIds = Array.from(new Set(verticalIds.filter(Boolean)));
	if (uniqueIds.length === 0) return;

	const now = new Date().toISOString();
	for (const vId of uniqueIds) {
		await db.insert(userVerticals).values({
			userId,
			verticalId: vId,
			createdAt: now
		});
	}
}

/**
 * Determine accessible vertical IDs for a user based on permissions.
 * RULE: "If there's no vertical assigned then data should not be visible to that user."
 */
export async function getAccessibleVerticalIds(user: { id: string; role: string } | null | undefined): Promise<string[]> {
	if (!user) return [];

	const assigned = await getUserAssignedVerticals(user.id);
	const assignedIds = assigned.map((v) => v.id);

	return assignedIds;
}
