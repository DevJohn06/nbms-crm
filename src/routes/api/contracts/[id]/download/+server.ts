import { error, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { contracts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { downloadFromR2 } from '$lib/server/r2';
import fs from 'fs/promises';
import path from 'path';

export const GET: RequestHandler = async ({ params }) => {
	const contractId = params.id;
	if (!contractId) {
		throw error(400, 'Contract ID required');
	}

	const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId));
	if (!contract || !contract.pdfPath) {
		throw error(404, 'Contract PDF not found');
	}

	// 1. Try reading from local static storage if it's a relative path
	if (!contract.pdfPath.startsWith('http://') && !contract.pdfPath.startsWith('https://')) {
		const filePath = path.join(process.cwd(), 'static', contract.pdfPath.replace(/^\//, ''));
		try {
			const fileBuffer = await fs.readFile(filePath);
			return new Response(fileBuffer, {
				headers: {
					'Content-Type': 'application/pdf',
					'Content-Disposition': `inline; filename="${contractId}.pdf"`
				}
			});
		} catch {
			// Local disk missed, fallback to R2 below
		}
	}

	// 2. Fetch directly from Cloudflare R2 object storage
	const r2Key = `contracts/${contractId}.pdf`;
	const r2Buffer = await downloadFromR2(r2Key);
	if (r2Buffer) {
		return new Response(r2Buffer as any, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="${contractId}.pdf"`
			}
		});
	}

	// 3. Last fallback check on local contracts folder directly
	const fallbackPath = path.join(process.cwd(), 'static', 'contracts', `${contractId}.pdf`);
	try {
		const fileBuffer = await fs.readFile(fallbackPath);
		return new Response(fileBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `inline; filename="${contractId}.pdf"`
			}
		});
	} catch {
		throw error(404, 'Contract PDF not found on disk or Cloudflare R2');
	}
};
