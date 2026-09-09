import { error, json, type RequestHandler } from '@sveltejs/kit';
import { backupDatabaseToR2, listR2DatabaseBackups } from '$lib/server/r2';

export const GET: RequestHandler = async () => {
	try {
		const backups = await listR2DatabaseBackups();
		return json({
			success: true,
			backups
		});
	} catch (err: any) {
		console.error('Failed to list R2 backups:', err);
		throw error(500, err?.message || 'Failed to list R2 backups.');
	}
};

export const POST: RequestHandler = async () => {
	try {
		const result = await backupDatabaseToR2();
		return json({
			success: true,
			message: 'Database backup successfully uploaded to Cloudflare R2 object storage.',
			backup: result
		});
	} catch (err: any) {
		console.error('Failed to backup database to R2:', err);
		throw error(500, err?.message || 'Failed to upload database backup to Cloudflare R2.');
	}
};
