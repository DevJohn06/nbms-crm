import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import fs from 'fs/promises';
import path from 'path';

/**
 * Dynamically resolves Cloudflare R2 configuration from SvelteKit environment or process.env
 */
export function getR2Config() {
	const accountId = env.CLOUDFLARE_ACCOUNT_ID || env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || '';
	const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID || '';
	const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || '';
	const bucketName = env.CLOUDFLARE_R2_BUCKET_NAME || env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.R2_BUCKET_NAME || 'nbms-crm';
	const publicDomain = env.CLOUDFLARE_R2_PUBLIC_URL || env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || '';

	return { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain };
}

let r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
	const config = getR2Config();
	if (!r2Client) {
		if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
			console.warn('[R2 Warning] Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are missing in environment.');
		}

		r2Client = new S3Client({
			region: 'auto',
			endpoint: `https://${config.accountId || 'dummy'}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: config.accessKeyId || 'dummy',
				secretAccessKey: config.secretAccessKey || 'dummy'
			}
		});
	}
	return r2Client;
}

/**
 * Upload a file or buffer directly to Cloudflare R2 Object Storage
 */
export async function uploadToR2(options: {
	key: string;
	body: Buffer | Uint8Array | string;
	contentType?: string;
}) {
	const config = getR2Config();
	const client = getR2Client();
	const command = new PutObjectCommand({
		Bucket: config.bucketName,
		Key: options.key,
		Body: options.body,
		ContentType: options.contentType || 'application/octet-stream'
	});

	await client.send(command);

	const fileUrl = config.publicDomain
		? `${config.publicDomain.replace(/\/$/, '')}/${options.key}`
		: '';

	return {
		key: options.key,
		bucket: config.bucketName,
		url: fileUrl
	};
}

/**
 * Fetch and stream an object directly from Cloudflare R2
 */
export async function downloadFromR2(key: string): Promise<Uint8Array | null> {
	try {
		const config = getR2Config();
		const client = getR2Client();
		const command = new GetObjectCommand({
			Bucket: config.bucketName,
			Key: key
		});

		const response = await client.send(command);
		if (!response.Body) return null;
		return await response.Body.transformToByteArray();
	} catch (err: any) {
		console.error(`[R2 Download Error for key ${key}]:`, err?.message || err);
		return null;
	}
}

/**
 * Delete an object from Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<boolean> {
	try {
		const config = getR2Config();
		const client = getR2Client();
		const command = new DeleteObjectCommand({
			Bucket: config.bucketName,
			Key: key
		});

		await client.send(command);
		return true;
	} catch (err: any) {
		console.error(`[R2 Delete Error for key ${key}]:`, err?.message || err);
		return false;
	}
}

/**
 * Backup the local SQLite database snapshot to Cloudflare R2
 */
export async function backupDatabaseToR2(databasePath?: string) {
	const config = getR2Config();
	const dbFile = databasePath || process.env.DATABASE_URL?.replace(/^file:/, '') || 'local.db';
	const resolvedPath = path.resolve(process.cwd(), dbFile);

	try {
		await fs.access(resolvedPath);
	} catch {
		throw new Error(`Database file at ${resolvedPath} not found for R2 backup.`);
	}

	const dbBuffer = await fs.readFile(resolvedPath);
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const dateFolder = new Date().toISOString().split('T')[0];

	// 1. Save timestamped backup snapshot
	const snapshotKey = `db-backups/${dateFolder}/nbms-db-${timestamp}.db`;
	const snapshotResult = await uploadToR2({
		key: snapshotKey,
		body: dbBuffer,
		contentType: 'application/x-sqlite3'
	});

	// 2. Save latest backup reference pointer
	const latestKey = 'db-backups/latest-database.db';
	await uploadToR2({
		key: latestKey,
		body: dbBuffer,
		contentType: 'application/x-sqlite3'
	});

	return {
		success: true,
		snapshotKey,
		latestKey,
		sizeBytes: dbBuffer.length,
		url: snapshotResult.url,
		timestamp: new Date().toISOString()
	};
}

/**
 * List all SQLite database backups stored in the Cloudflare R2 bucket
 */
export async function listR2DatabaseBackups() {
	try {
		const config = getR2Config();
		const client = getR2Client();
		const command = new ListObjectsV2Command({
			Bucket: config.bucketName,
			Prefix: 'db-backups/'
		});

		const response = await client.send(command);
		return (response.Contents || []).map((item) => ({
			key: item.Key || '',
			size: item.Size || 0,
			lastModified: item.LastModified ? item.LastModified.toISOString() : ''
		}));
	} catch (err: any) {
		console.error('[R2 List Error]', err);
		return [];
	}
}
