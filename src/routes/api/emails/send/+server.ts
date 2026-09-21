import { json, error, type RequestHandler } from '@sveltejs/kit';
import { sendEmailToLead } from '$lib/server/email';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { leadId, templateId, subject, bodyHtml, newStatusOnSend, recipient } = body;

	if (!leadId || !subject || !bodyHtml) {
		throw error(400, 'Missing required fields: leadId, subject, bodyHtml');
	}

	try {
		const result = await sendEmailToLead({
			leadId: Number(leadId),
			templateId: templateId ? Number(templateId) : undefined,
			subject,
			bodyHtml,
			newStatusOnSend,
			recipient: recipient ? String(recipient).trim() : undefined
		});

		return json(result);
	} catch (err: any) {
		console.error('Email dispatch error:', err);
		throw error(500, err?.message || 'Failed to dispatch email');
	}
};
