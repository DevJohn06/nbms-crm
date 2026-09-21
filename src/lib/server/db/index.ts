import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const dbUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;

export const client = createClient({
	url: dbUrl,
	authToken: authToken
});
export const db = drizzle(client, { schema });

// Auto-initialize SQLite database tables on startup
export async function initDatabase() {
	try {
		await client.execute(`
			CREATE TABLE IF NOT EXISTS leads (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				business_name TEXT NOT NULL,
				email TEXT NOT NULL,
				phone TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'NEW',
				notes TEXT,
				custom_fields TEXT,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
		`);

		await client.execute(`
			CREATE TABLE IF NOT EXISTS email_templates (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT NOT NULL,
				subject TEXT NOT NULL,
				body_html TEXT NOT NULL,
				trigger_stage TEXT,
				created_at TEXT NOT NULL
			);
		`);

		await client.execute(`
			CREATE TABLE IF NOT EXISTS email_logs (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
				template_id INTEGER REFERENCES email_templates(id) ON DELETE SET NULL,
				sender TEXT NOT NULL,
				recipient TEXT NOT NULL,
				subject TEXT NOT NULL,
				body_html TEXT NOT NULL,
				status TEXT NOT NULL DEFAULT 'SENT',
				direction TEXT NOT NULL DEFAULT 'OUTBOUND',
				sent_at TEXT NOT NULL
			);
		`);

		// Migration: ensure email_logs column is named sent_at (snake_case) to match Drizzle schema
		try {
			await client.execute(`ALTER TABLE email_logs RENAME COLUMN sentAt TO sent_at;`);
		} catch {
			// Column already renamed or table newly created
		}

		await client.execute(`
			CREATE TABLE IF NOT EXISTS contracts (
				id TEXT PRIMARY KEY,
				lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
				client_name TEXT NOT NULL,
				client_email TEXT NOT NULL,
				service_package TEXT NOT NULL,
				monthly_fee TEXT NOT NULL,
				contract_terms TEXT NOT NULL,
				signature_data TEXT,
				pdf_path TEXT,
				status TEXT NOT NULL DEFAULT 'DRAFT',
				created_at TEXT NOT NULL,
				signed_at TEXT
			);
		`);

		await client.execute(`
			CREATE TABLE IF NOT EXISTS intake_cms (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				subtitle TEXT,
				content_json TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
		`);

		await client.execute(`
			CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				email TEXT NOT NULL UNIQUE,
				password_hash TEXT NOT NULL,
				name TEXT NOT NULL,
				role TEXT NOT NULL DEFAULT 'AGENT',
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
		`);

		await client.execute(`
			CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				expires_at INTEGER NOT NULL
			);
		`);

		await client.execute(`
			CREATE TABLE IF NOT EXISTS booked_calls (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
				client_name TEXT NOT NULL,
				client_email TEXT NOT NULL,
				client_phone TEXT,
				business_name TEXT,
				call_date TEXT NOT NULL,
				meeting_type TEXT NOT NULL DEFAULT 'Merchant Strategy Session',
				notes TEXT,
				status TEXT NOT NULL DEFAULT 'SCHEDULED',
				created_at TEXT NOT NULL
			);
		`);

		await client.execute(`
			CREATE TABLE IF NOT EXISTS verticals (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				slug TEXT NOT NULL UNIQUE,
				description TEXT,
				subdomain TEXT,
				theme_color TEXT,
				is_default INTEGER DEFAULT 0,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
		`);

		await client.execute(`
			CREATE TABLE IF NOT EXISTS user_verticals (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				vertical_id TEXT NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
				created_at TEXT NOT NULL
			);
		`);

		// Migration: ensure columns exist for verticals integration
		try {
			await client.execute(`ALTER TABLE leads ADD COLUMN vertical_id TEXT REFERENCES verticals(id);`);
		} catch {}

		try {
			await client.execute(`ALTER TABLE booked_calls ADD COLUMN vertical_id TEXT REFERENCES verticals(id);`);
		} catch {}

		try {
			await client.execute(`ALTER TABLE intake_cms ADD COLUMN vertical_id TEXT DEFAULT 'mmj-dispensary';`);
		} catch {}

		try {
			await client.execute(`ALTER TABLE intake_cms ADD COLUMN section_id TEXT;`);
		} catch {}

		// Migration: ensure secondary_email column exists on leads
		try {
			await client.execute(`ALTER TABLE leads ADD COLUMN secondary_email TEXT;`);
		} catch {}

		// Migration: Split multi-email entries in leads into primary email and secondary_email
		try {
			const checkLeads = await client.execute(`SELECT id, email FROM leads WHERE email IS NOT NULL;`);
			for (const row of checkLeads.rows) {
				const rawEmail = String(row.email || '').trim();
				const tokens = rawEmail
					.split(/[\s,;]+/)
					.map((e) => e.trim().replace(/^[<(\[]+|[>)\]]+$/g, ''))
					.filter((e) => e.includes('@'));
				if (tokens.length > 1) {
					const primary = tokens[0];
					const secondary = Array.from(new Set(tokens.slice(1))).join(', ');
					await client.execute({
						sql: `UPDATE leads SET email = ?, secondary_email = COALESCE(secondary_email, ?) WHERE id = ?`,
						args: [primary, secondary, row.id]
					});
				}
			}
		} catch (e) {
			console.error('Failed to migrate multi-email leads:', e);
		}

		// Seed initial Developer Super Admin if target email does not exist
		const initialEmail = (process.env.SUPERADMIN_EMAIL || 'admin').toLowerCase();
		const existingAdmin = await client.execute({
			sql: `SELECT id FROM users WHERE email = ?`,
			args: [initialEmail]
		});

		if (existingAdmin.rows.length === 0) {
			const { hashPassword } = await import('../auth/auth');
			const now = new Date().toISOString();
			const superAdminId = 'user_super_admin_dev';
			const initialPassword = process.env.SUPERADMIN_PASSWORD || 'admin';
			const passwordHash = hashPassword(initialPassword);

			await client.execute({
				sql: `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
				args: [
					superAdminId,
					initialEmail,
					passwordHash,
					'admin',
					'SUPER_ADMIN',
					now,
					now
				]
			});
			console.log(`[AUTH SEED] Initial Super Admin account created: ${initialEmail}`);
		}

		// Seed initial Default Vertical: MMJ Dispensary
		const defaultVerticalCheck = await client.execute({
			sql: `SELECT id FROM verticals WHERE id = 'mmj-dispensary'`
		});

		if (defaultVerticalCheck.rows.length === 0) {
			const now = new Date().toISOString();
			await client.execute({
				sql: `INSERT OR IGNORE INTO verticals (id, name, slug, description, subdomain, is_default, created_at, updated_at)
				      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				args: [
					'mmj-dispensary',
					'MMJ Dispensary',
					'mmj-dispensary',
					'Medical Marijuana Dispensaries & High-Risk Cannabis Retail Payment Processing',
					'dispensary',
					1,
					now,
					now
				]
			});
			console.log(`[VERTICALS SEED] Initial default vertical created: MMJ Dispensary (mmj-dispensary)`);
		}

		// Backfill existing leads, calls, and CMS entries without vertical_id
		await client.execute(`UPDATE leads SET vertical_id = 'mmj-dispensary' WHERE vertical_id IS NULL OR vertical_id = '';`);
		await client.execute(`UPDATE booked_calls SET vertical_id = 'mmj-dispensary' WHERE vertical_id IS NULL OR vertical_id = '';`);
		await client.execute(`UPDATE intake_cms SET vertical_id = 'mmj-dispensary' WHERE vertical_id IS NULL OR vertical_id = '';`);
		await client.execute(`UPDATE intake_cms SET section_id = id WHERE section_id IS NULL OR section_id = '';`);

		// Seed initial user vertical assignment for Super Admin
		const adminUserRes = await client.execute({
			sql: `SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1`
		});
		if (adminUserRes.rows.length > 0) {
			const adminUserId = String(adminUserRes.rows[0].id);
			const userVertCheck = await client.execute({
				sql: `SELECT id FROM user_verticals WHERE user_id = ? AND vertical_id = 'mmj-dispensary'`,
				args: [adminUserId]
			});
			if (userVertCheck.rows.length === 0) {
				const now = new Date().toISOString();
				await client.execute({
					sql: `INSERT INTO user_verticals (user_id, vertical_id, created_at) VALUES (?, ?, ?)`,
					args: [adminUserId, 'mmj-dispensary', now]
				});
				console.log(`[USER VERTICALS SEED] Assigned Super Admin (${adminUserId}) to MMJ Dispensary`);
			}
		}

		// Seed & Migrate default Intake CMS sections
		const now = new Date().toISOString();
		const defaultCmsEntries = [
			{
				id: 'hero',
				title: 'ATM Payment Processing Solutions',
				subtitle: 'Apply Today, Be In Business Tomorrow!',
				content: {
					badge: 'ATM Payment Processing Solutions',
					tagline: 'THEY DECLINE. WE APPROVE.',
					primaryCta: 'Get Info',
					secondaryCta: 'Book A Call'
				}
			},
			{
				id: 'process_flow',
				title: 'What is an ATM Merchant Account?',
				subtitle:
					"An ATM merchant account isn't a standard bank account but a specialized service allowing businesses to process electronic payments (cards, digital wallets) by acting as a temporary holding account for customer funds before transferring them to your regular business checking account, facilitated by a merchant service provider and an acquiring bank, essential for modern non-cash transactions and often involving fees.",
				content: {
					primaryCta: 'Get Info',
					secondaryCta: 'Book A Call'
				}
			},
			{
				id: 'about',
				title: 'High-Risk Business Categories',
				subtitle: 'Understanding processor guidelines, risk classification, and high-risk merchant placement.',
				content: {
					description:
						"The first thing to understand about high-risk businesses is that your processor will determine whether you fall into one of their high-risk categories when you apply for a merchant account. Either you’re high-risk, or you’re not – there is no middle ground. Beyond that, it gets complicated as every processor has their own unique guidelines for determining whether you’re in the high-risk category. While some business types, will almost always be placed in the high-risk group, others may or may not be. Some merchant services providers have very strict guidelines for determining high-risk status, while others use more relaxed criteria. If you’re considering a particular provider, check their website or contact them directly to see if they find your business to be high-risk. This can save you a lot of time and effort in wasted applications to providers who aren’t going to approve you.\n\nHow a merchant services provider treats a high-risk business can also vary widely. Many providers, particularly those that try to offer merchant services at the lowest possible prices, simply do not accept any high-risk businesses at all. This helps to reduce their exposure to fraud and keeps costs low for their existing clients. You will find most providers will allow certain high-risk companies, but will charge you significantly higher rates and fees for your merchant account due to the elevated risk they’re accepting by giving you a merchant account. There’s also a third category of providers who specialize in placing high-risk businesses. While their rates and fees aren’t a good deal for non-high-risk merchants, they can often provide a merchant account for high-risk businesses that have been turned down by other providers.",
					transitionNotice:
						"We’re always just a phone call away and are more than happy to answer any of your questions, but here are a few questions that we get asked all the time."
				}
			},
			{
				id: 'how_it_works',
				title: 'NBMS Pin Debit Cashless ATM Terminals',
				subtitle: 'State-of-the-art EMV & PCI compliant payment terminals engineered for countertop checkout, home delivery, and zero merchant fees.',
				content: {
					hideSection: false,
					features: [
						{
							title: '$5.00 Increment Pin Debit System',
							desc: 'Countertop cashless ATM terminals processing transactions smoothly in $5 increment steps.'
						},
						{
							title: 'EMV & PCI-Compliant Hardware',
							desc: 'Next-gen secure terminal hardware equipped with tap, chip, and PIN encryption at industry-leading wholesale pricing.'
						},
						{
							title: 'Direct Bank Deposits & Less Cash Handling',
							desc: 'Daily automated settlements directly to your bank account, keeping cash on hand low and eliminating theft risks.'
						},
						{
							title: 'Zero Merchant Processing Costs',
							desc: 'Eliminates merchant transaction fees with transparent, ultra-low consumer convenience fees.'
						},
						{
							title: 'Higher Ticket Size & Customer Experience',
							desc: 'Frictionless checkout experience that elevates customer satisfaction and yields higher average sales.'
						},
						{
							title: 'In-Store & Home Delivery Mobility',
							desc: 'Portable wireless terminals engineered for retail counters, mobile popup shops, and home delivery services.'
						},
						{
							title: 'Customizable $500 Limit Caps',
							desc: 'Merchants choose custom purchase dollar limits up to $500.00 directly from their admin portal.'
						},
						{
							title: 'Real-Time Settlement Reporting',
							desc: 'Specialized merchant login for live customized reporting on settlements, batches, and transactions.'
						},
						{
							title: '24/7 Priority Support',
							desc: 'Around-the-clock technical assistance and underwriting support whenever you need help.'
						}
					]
				}
			},
			{
				id: 'contact',
				title: 'Merchant Support & Priority Assistance',
				subtitle: 'Our dedicated account management team is here to answer all your processing questions.',
				content: {
					hideSection: false,
					email: 'sales@nbmsinc.com',
					phone: '(877) 817-2257',
					hours: 'Mon - Sun: 24/7 Priority Desk',
					helpNotice: 'Ready to get started or compare your current rates? Reach out to our underwriting team today.'
				}
			},
			{
				id: 'faqs',
				title: 'Frequently Asked Questions',
				subtitle: 'Everything you need to know about ATM processing, high-risk approval, PCI security, and settlements.',
				content: {
					hideSection: false,
					items: [
						{
							question: 'What are cashless ATMs and how are they being used?',
							answer: 'A cashless ATM is very similar to a regular ATM where cardholders can request funds using their debit card and 4 digit PIN. However, instead of receiving cash, they will receive a receipt from the merchant. The merchant will receive the funds via ACH, comparable to debit and credit card payment systems, and the customer can avoid having to take out cash from a stand alone ATM.'
						},
						{
							question: 'Why Choose a Cashless ATM?',
							answer: 'NBMS created a payment processing solution that would allow high risk types of establishments to accept card payments, simplify the checkout experience for customers, and provide greater security by reducing the large amounts of cash being held and handled on location by these merchants.'
						},
						{
							question: 'Tired of submitting applications and not getting approved?',
							answer: 'We guarantee you’ll get approved with our cashless ATM solution within 24-48 business hours. Furthermore, there’s no risk of getting placed on the TMF/Match list by utilizing these services since you’re accepting transactions on the ATM rails, no different than your traditional ATM! Already on the TMF list? Then, give us a call, and we’ll help you start accepting cashless payments once again without paying significant fees.'
						},
						{
							question: 'How long does the approval and shipping process take?',
							answer: 'Once we receive the required documents and application for approval, we’ll be able to get you approved within 24 business hours. Once the approval and programming process is complete the terminal is shipped, and the unit will arrive as an “out of the box solution!”'
						},
						{
							question: 'When can I expect the funds in my account?',
							answer: 'Payments are real-time and funds are deposited into your bank account the next day. You’ll receive a FREE online portal to view all sales on a real time daily/weekly/monthly basis as well.'
						},
						{
							question: 'Who do I contact for support?',
							answer: 'We not only provide support from our US based support teams, but we always recommend contacting your NBMS Agent first. We constantly focus on building longstanding partnerships with each one of our Merchants plus we know more about your account than anyone else. Always contact your Agent first and they’ll take care of you. Plus, each terminal is backed with a one year manufacturer’s warranty, so if they break we will replace them.'
						},
						{
							question: 'How am I able to accept card purchases with this solution?',
							answer: 'Cashless ATM transactions are considered ATM withdrawals. The card must be present, and the four-digit pin number must be entered correctly in order for the transaction to get approved.'
						},
						{
							question: 'Are there any additional Cashless ATM Perks?',
							answer: '• Receive a state-of-the-art terminals (includes storefront and wireless units).\n• NO personal information or financial documents required for approval. We simply need the standard KYC requirements for any merchant application.\n• Card present pin-based transactions effectively reduce chargebacks (customer disputes) or the chance of fraudulent transactions.\n• Unlike a traditional merchant account, there are NO rates or fees for any Cashless ATM transaction. The Cashless ATM transaction cost is charged to the customer in the form of an ATM fee saving your business hundreds, if not thousands of dollars every month!\n• There is peace of mind and sense of security for all parties involved as these transactions are handled in a cashless manner.\n• Incremental transactions allow your employees to receive additional tips (helps reduce employee attrition).\n• Installation is easy. Simply plug the units in (or power on the wireless units) and you are ready to process, but we’re always on standby for any ongoing assistance.\n• Transactions are discreet. Shown as ATM withdrawals on your customers bank statements.'
						}
					]
				}
			},
			{
				id: 'footer',
				title: 'Footer Section',
				subtitle: 'Footer call to action banner and footer links.',
				content: {
					ctaBanner: {
						title: 'Ready to Get Started with NBMS?',
						subtitle: 'Start processing cashless Pin Debit payments with zero merchant fees and daily direct bank deposits.',
						primaryCta: 'Get Info',
						secondaryCta: 'Book A Call'
					},
					copyright: '© 2026 NBMS INC. All rights reserved.'
				}
			}
		];

		for (const entry of defaultCmsEntries) {
			await client.execute({
				sql: `INSERT INTO intake_cms (id, title, subtitle, content_json, updated_at)
				      VALUES (?, ?, ?, ?, ?)
				      ON CONFLICT(id) DO UPDATE SET
				        title = excluded.title,
				        subtitle = excluded.subtitle,
				        content_json = excluded.content_json,
				        updated_at = excluded.updated_at
				      WHERE intake_cms.title LIKE '%Why Process%'
				         OR intake_cms.title LIKE '%3-Step Merchant Onboarding%'
				         OR intake_cms.title LIKE '%Merchant Setup%';`,
				args: [
					entry.id,
					entry.title,
					entry.subtitle,
					JSON.stringify(entry.content),
					now
				]
			});
		}

		// Seed initial default email templates if empty
		const existingTemplates = await client.execute(`SELECT COUNT(*) as count FROM email_templates`);
		const count = Number(existingTemplates.rows[0]?.count || 0);

		if (count === 0) {
			const now = new Date().toISOString();
			await client.execute({
				sql: `INSERT INTO email_templates (name, subject, body_html, trigger_stage, created_at) VALUES (?, ?, ?, ?, ?)`,
				args: [
					'Welcome & Introduction',
					'Exclusive Partnership Opportunity with NBMS',
					'<p>Hi {{businessName}},</p><p>Welcome to NBMS! We help growing businesses streamline payment processing and boost customer retention.</p><p>Check out your custom proposal & onboarding funnel here: <a href="{{funnelLink}}">{{funnelLink}}</a></p><p>Best regards,<br>NBMS Onboarding Team</p>',
					'NEW',
					now
				]
			});

			await client.execute({
				sql: `INSERT INTO email_templates (name, subject, body_html, trigger_stage, created_at) VALUES (?, ?, ?, ?, ?)`,
				args: [
					'Contract Offer & Funnel Onboarding',
					'Your NBMS Merchant Service Agreement',
					'<p>Hello {{businessName}},</p><p>Your NBMS merchant onboarding agreement is ready for review and digital signature!</p><p>Please access your contract portal here: <a href="{{funnelLink}}">{{funnelLink}}</a></p><p>Questions? Simply reply directly to this email.</p><p>Cheers,<br>NBMS Sales</p>',
					'EMAILED',
					now
				]
			});
		}
	} catch (error) {
		console.error('Error auto-initializing database:', error);
	}
}

// Run init
initDatabase();
