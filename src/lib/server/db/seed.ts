import { db, initDatabase } from './index';
import { leads, emailTemplates, emailLogs, contracts } from './schema';

export async function seedDemoData() {
	await initDatabase();

	// Check existing leads count
	const existingLeads = await db.select().from(leads);
	if (existingLeads.length > 0) {
		console.log('Database already contains lead records.');
		return;
	}

	console.log('Seeding demo data for NBMS CRM...');

	const now = new Date().toISOString();
	const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

	// 1. Seed Leads
	const sampleLeads = [
		{
			businessName: 'Acme Retail Solutions',
			email: 'contact@acmeretail.io',
			phone: '+1 (555) 234-5678',
			status: 'NEW',
			notes: 'Interested in POS credit card integration and low interchange rates.',
			customFields: JSON.stringify({ MonthlyVolume: '$45,000', CurrentProcessor: 'Stripe' }),
			createdAt: daysAgo(7),
			updatedAt: daysAgo(7)
		},
		{
			businessName: 'Apex Fitness Center',
			email: 'billing@apexfitness.com',
			phone: '+1 (555) 876-5432',
			status: 'EMAILED',
			notes: 'Sent welcome email with NBMS Merchant package options.',
			customFields: JSON.stringify({ MonthlyVolume: '$120,000', CurrentProcessor: 'Square' }),
			createdAt: daysAgo(5),
			updatedAt: daysAgo(4)
		},
		{
			businessName: 'Nexus Tech Consulting',
			email: 'payments@nexustech.co',
			phone: '+1 (555) 998-1122',
			status: 'CONTACTED',
			notes: 'Called CFO directly; requested virtual terminal for recurring billing.',
			customFields: JSON.stringify({ MonthlyVolume: '$85,000', CurrentProcessor: 'Authorise.Net' }),
			createdAt: daysAgo(4),
			updatedAt: daysAgo(2)
		},
		{
			businessName: 'Oceanview Bistro & Bar',
			email: 'gm@oceanviewbistro.com',
			phone: '+1 (555) 443-2211',
			status: 'FUNNEL_COMPLETED',
			notes: 'Filled out online funnel intake form. Selected Growth Pro package.',
			customFields: JSON.stringify({ MonthlyVolume: '$200,000', CurrentProcessor: 'Clover' }),
			createdAt: daysAgo(3),
			updatedAt: daysAgo(1)
		},
		{
			businessName: 'Vanguard Logistics LLC',
			email: 'admin@vanguardlogistics.com',
			phone: '+1 (555) 332-9988',
			status: 'CONTRACT_SENT',
			notes: 'Generated contract sent for digital signature via automated email.',
			customFields: JSON.stringify({ MonthlyVolume: '$500,000', CurrentProcessor: 'Chase Paymentech' }),
			createdAt: daysAgo(2),
			updatedAt: daysAgo(1)
		},
		{
			businessName: 'Zenith Organic Market',
			email: 'store@zenithorganic.org',
			phone: '+1 (555) 667-8899',
			status: 'CONTRACT_SIGNED',
			notes: 'Merchant contract signed! Onboarding complete.',
			customFields: JSON.stringify({ MonthlyVolume: '$95,000', CurrentProcessor: 'Toast' }),
			createdAt: daysAgo(10),
			updatedAt: daysAgo(1)
		}
	];

	const insertedLeads = await db.insert(leads).values(sampleLeads).returning();

	// 2. Seed Email Logs for the leads
	if (insertedLeads.length >= 6) {
		await db.insert(emailLogs).values([
			{
				leadId: insertedLeads[1].id,
				templateId: 1,
				sender: 'onboarding@nbmsinc.com',
				recipient: insertedLeads[1].email,
				subject: 'Exclusive Partnership Opportunity with NBMS',
				bodyHtml: `<p>Hi ${insertedLeads[1].businessName},</p><p>Welcome to NBMS! We help growing businesses streamline payment processing and boost customer retention.</p>`,
				status: 'DELIVERED',
				direction: 'OUTBOUND',
				sentAt: daysAgo(4)
			},
			{
				leadId: insertedLeads[3].id,
				templateId: 2,
				sender: 'sales@nbmsinc.com',
				recipient: insertedLeads[3].email,
				subject: 'Your NBMS Merchant Service Agreement',
				bodyHtml: `<p>Hello ${insertedLeads[3].businessName},</p><p>Your merchant onboarding agreement is ready for review.</p>`,
				status: 'DELIVERED',
				direction: 'OUTBOUND',
				sentAt: daysAgo(1)
			}
		]);

		// 3. Seed sample signed contract
		await db.insert(contracts).values([
			{
				id: 'NBMS-CON-883921',
				leadId: insertedLeads[5].id,
				clientName: 'Sarah Jenkins (Owner)',
				clientEmail: insertedLeads[5].email,
				servicePackage: 'Growth Pro Merchant Package',
				monthlyFee: '$199 / mo',
				contractTerms: '12-Month Merchant Processing Agreement at 1.45% + $0.10 per transaction rate.',
				signatureData: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><path d="M 10 50 Q 50 10 90 50 T 170 50 T 250 50" stroke="%231f71c1" stroke-width="3" fill="none"/></svg>',
				status: 'SIGNED',
				createdAt: daysAgo(10),
				signedAt: daysAgo(1)
			}
		]);
	}

	console.log('Seed completed successfully!');
}

seedDemoData().catch(console.error);
