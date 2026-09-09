import { error, json, type RequestHandler } from '@sveltejs/kit';
import { generateContractPdf, saveContractSubmission } from '$lib/server/pdf';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const leadId = Number(body.leadId);

		if (!leadId || isNaN(leadId)) {
			throw error(400, 'Valid leadId is required');
		}

		if (body.clientName && body.servicePackage) {
			await saveContractSubmission({
				leadId,
				clientName: body.clientName,
				clientEmail: body.clientEmail || body.email || '',
				servicePackage: body.servicePackage,
				monthlyFee: body.monthlyFee || '$199 / month',
				contractTerms: body.contractTerms || 'Standard Payjeezy 12-Month Merchant Processing Agreement.',
				signatureData: body.signatureData
			});
		}

		const result = await generateContractPdf(leadId);

		return json({
			success: true,
			pdfUrl: result.pdfUrl,
			contract: result.contract
		});
	} catch (err: any) {
		console.error('Failed to generate contract PDF:', err);
		throw error(500, err?.message || 'Failed to generate contract PDF.');
	}
};
