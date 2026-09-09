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

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || undefined;

console.log('--- TURSO DATABASE SCHEMA MIGRATION ---');
console.log('Target Database URL:', url);
console.log('Auth Token Present:', Boolean(authToken));

const client = createClient({
	url,
	authToken
});

async function migrate() {
	try {
		console.log('\nCreating tables in database...');

		// 1. Leads Table
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
		console.log('✓ Table "leads" created/verified.');

		// 2. Email Templates Table
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
		console.log('✓ Table "email_templates" created/verified.');

		// 3. Email Logs Table
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
		console.log('✓ Table "email_logs" created/verified.');

		// 4. Contracts Table
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
		console.log('✓ Table "contracts" created/verified.');

		// 5. Intake CMS Table
		await client.execute(`
			CREATE TABLE IF NOT EXISTS intake_cms (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				subtitle TEXT,
				content_json TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);
		`);
		console.log('✓ Table "intake_cms" created/verified.');

		// 6. Users Table
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
		console.log('✓ Table "users" created/verified.');

		// 7. Sessions Table
		await client.execute(`
			CREATE TABLE IF NOT EXISTS sessions (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				expires_at INTEGER NOT NULL
			);
		`);
		console.log('✓ Table "sessions" created/verified.');

		// 8. Booked Calls Table
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
		console.log('✓ Table "booked_calls" created/verified.');

		// Seed initial default Admin user if empty
		const existingUsers = await client.execute(`SELECT COUNT(*) as count FROM users`);
		const userCount = Number(existingUsers.rows[0]?.count || 0);

		if (userCount === 0) {
			console.log('\nSeeding default admin user...');
			const now = new Date().toISOString();
			await client.execute({
				sql: `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
				args: [
					'usr-superadmin-01',
					'admin@nbmsinc.com',
					'scrypt:32768:8:1$vDqYp3bJ$9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
					'Dev Admin',
					'SUPER_ADMIN',
					now,
					now
				]
			});
			console.log('✓ Default Admin User created (admin@nbmsinc.com).');
		}

		// Seed initial email templates if empty
		const existingTemplates = await client.execute(`SELECT COUNT(*) as count FROM email_templates`);
		const templateCount = Number(existingTemplates.rows[0]?.count || 0);

		if (templateCount === 0) {
			console.log('Seeding default email templates...');
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
			console.log('✓ Default Email Templates created.');
		}

		console.log('\n🎉 SUCCESS! Database schema migration & initial seeding complete!');
	} catch (err) {
		console.error('\n❌ Migration failed:', err);
		process.exit(1);
	}
}

migrate();
