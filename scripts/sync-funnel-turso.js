import fs from 'fs';
import { createClient } from '@libsql/client';

try {
	const envText = fs.readFileSync('.env', 'utf8');
	envText.split('\n').forEach((line) => {
		const [k, ...v] = line.split('=');
		if (k && v.length) {
			const key = k.trim();
			const val = v.join('=').trim().replace(/^['"]|['"]$/g, '');
			if (key && !key.startsWith('#')) {
				process.env[key] = val;
			}
		}
	});
} catch (err) {
	console.error('Could not load .env file:', err);
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
	console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env');
	process.exit(1);
}

console.log('--- SYNCING FUNNEL CMS TO TURSO LIVE DATABASE ---');
console.log('Target URL:', url);

const client = createClient({
	url,
	authToken
});

async function main() {
	try {
		// Ensure table exists in Turso
		await client.execute(`
			CREATE TABLE IF NOT EXISTS intake_cms (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				subtitle TEXT,
				content_json TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
		`);
		console.log('✓ Verified "intake_cms" table exists in Turso.');

		const now = new Date().toISOString();

		// 1. Hero Section
		await client.execute({
			sql: `INSERT OR REPLACE INTO intake_cms (id, title, subtitle, content_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
			args: [
				'hero',
				'ATM Payment Processing Solutions',
				'Apply Today, Be In Business Tomorrow!',
				JSON.stringify({
					badge: 'ATM Payment Processing Solutions',
					tagline: 'THEY DECLINE. WE APPROVE.',
					primaryCta: 'Get Info',
					secondaryCta: 'Book A Call',
					hideSection: false,
					hideBadge: false,
					hideTitle: false,
					hideSubtitle: false,
					hideTagline: false,
					hidePrimaryCta: false,
					hideSecondaryCta: false
				}),
				now
			]
		});
		console.log('✓ Synced Hero section to Turso.');

		// 2. What is an ATM Merchant Account (process_flow)
		await client.execute({
			sql: `INSERT OR REPLACE INTO intake_cms (id, title, subtitle, content_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
			args: [
				'process_flow',
				'What is an ATM Merchant Account?',
				"An ATM merchant account isn't a standard bank account but a specialized service allowing businesses to process electronic payments (cards, digital wallets) by acting as a temporary holding account for customer funds before transferring them to your regular business checking account, facilitated by a merchant service provider and an acquiring bank, essential for modern non-cash transactions and often involving fees.",
				JSON.stringify({
					primaryCta: 'Get Info',
					secondaryCta: 'Book A Call',
					hideSection: false
				}),
				now
			]
		});
		console.log('✓ Synced "What is an ATM Merchant Account" section to Turso.');

		// 3. Product Showcase (how_it_works)
		await client.execute({
			sql: `INSERT OR REPLACE INTO intake_cms (id, title, subtitle, content_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
			args: [
				'how_it_works',
				'NBMS Pin Debit Cashless ATM Terminals',
				'State-of-the-art EMV & PCI compliant payment terminals engineered for countertop checkout, home delivery, and zero merchant fees.',
				JSON.stringify({
					features: [
						{
							title: '$5.00 Increment Pin Debit System',
							desc: 'Countertop cashless ATM terminals processing transactions smoothly in $5.00 increment steps.'
						},
						{
							title: 'EMV & PCI-Compliant Hardware',
							desc: 'Next-gen secure payment terminals with tap, chip, and PIN encryption at industry-leading wholesale pricing.'
						},
						{
							title: 'Direct Bank Account Deposits',
							desc: 'Processing revenue deposits directly into your business checking account, keeping cash-on-hand low and eliminating theft risks.'
						},
						{
							title: 'Zero Merchant Processing Costs',
							desc: 'Eliminates merchant transaction fees with transparent, ultra-low consumer convenience fees.'
						},
						{
							title: 'Higher Sales & Customer Experience',
							desc: 'Frictionless checkout experience that elevates customer satisfaction and yields higher average ticket sizes.'
						},
						{
							title: 'In-Store & Home Delivery Mobility',
							desc: 'Easy, flexible, and portable payment system built for retail counters and home delivery services.'
						},
						{
							title: 'Customizable $500 Limit Caps',
							desc: 'The merchant chooses their purchase dollar limits of up to $500.00 directly from their portal.'
						},
						{
							title: 'Real-Time Customized Reporting',
							desc: 'Specialized merchant login for live customized reporting on settlements, batches, and transactions.'
						},
						{
							title: '24/7 Priority Technical Support',
							desc: 'Around-the-clock technical assistance and underwriting support whenever you need help.'
						}
					]
				}),
				now
			]
		});
		console.log('✓ Synced Product Showcase section to Turso.');

		// 4. About Section
		await client.execute({
			sql: `INSERT OR REPLACE INTO intake_cms (id, title, subtitle, content_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
			args: [
				'about',
				'Why Process With NBMS?',
				'Transparent interchange-plus rates, instant settlements, and dedicated 24/7 support.',
				JSON.stringify({
					description:
						'NBMS provides industry-leading payment processing infrastructure for thousands of retail, ecommerce, and mobile merchants nationwide.',
					features: [
						{
							title: 'Interchange-Plus Pricing',
							desc: 'Wholesale transaction rates with zero hidden surcharges or monthly markups.'
						},
						{
							title: 'Same-Day Direct Settlements',
							desc: 'Processing revenue is deposited directly into your business checking account.'
						},
						{
							title: 'PCI-DSS Level 1 Security',
							desc: 'Hardware tokenization and end-to-end encryption for 100% compliance.'
						}
					]
				}),
				now
			]
		});
		console.log('✓ Synced About section to Turso.');

		// 5. Contact Section
		await client.execute({
			sql: `INSERT OR REPLACE INTO intake_cms (id, title, subtitle, content_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
			args: [
				'contact',
				'Merchant Support & Assistance',
				'Our dedicated account management team is here to assist you.',
				JSON.stringify({
					email: 'sales@nbmsinc.com',
					phone: '(877) 817-2257',
					hours: 'Mon - Fri: 8:00 AM - 8:00 PM EST',
					helpNotice: 'Questions about processing rates or equipment? Contact your onboarding specialist directly.'
				}),
				now
			]
		});
		console.log('✓ Synced Contact section to Turso.');

		// 6. Section Order
		await client.execute({
			sql: `INSERT OR REPLACE INTO intake_cms (id, title, subtitle, content_json, updated_at) VALUES (?, ?, ?, ?, ?)`,
			args: [
				'section_order',
				'Section Order',
				'',
				JSON.stringify({
					order: ['hero', 'process_flow', 'how_it_works', 'about', 'contact']
				}),
				now
			]
		});
		console.log('✓ Synced Section Order to Turso.');

		// Verify records in Turso
		const verify = await client.execute('SELECT id, title FROM intake_cms');
		console.log('\n--- VERIFIED TURSO INTAKE CMS RECORDS ---');
		verify.rows.forEach((r) => {
			console.log(`• [${r.id}] -> ${r.title}`);
		});

		console.log('\n🎉 ALL FUNNEL CHANGES SUCCESSFULLY MIGRATED TO TURSO LIVE DATABASE!');
	} catch (err) {
		console.error('\n❌ Turso migration failed:', err);
		process.exit(1);
	}
}

main();
