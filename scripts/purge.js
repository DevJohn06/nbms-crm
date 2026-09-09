import { createClient } from '@libsql/client';

const client = createClient({ url: 'file:local.db' });

async function purge() {
	console.log('Purging test leads, email logs, and contracts...');
	await client.execute('DELETE FROM email_logs;');
	await client.execute('DELETE FROM contracts;');
	await client.execute('DELETE FROM leads;');
	
	try {
		await client.execute("DELETE FROM sqlite_sequence WHERE name IN ('leads', 'email_logs', 'contracts');");
	} catch (e) {}

	const result = await client.execute('SELECT COUNT(*) as count FROM leads;');
	console.log(`Success! Lead count is now: ${result.rows[0].count}`);
}

purge().catch(console.error);
