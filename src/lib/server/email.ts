import { Resend } from 'resend';
import { db } from './db';
import { emailLogs, leads } from './db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

export function compileTemplate(
	templateText: string,
	vars: { businessName: string; email: string; phone: string; funnelLink: string; [key: string]: string }
): string {
	let output = templateText;
	for (const key of Object.keys(vars)) {
		const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
		output = output.replace(regex, vars[key] || '');
	}
	return output;
}

export interface SendEmailParams {
	leadId: number;
	templateId?: number;
	sender?: string;
	subject: string;
	bodyHtml: string;
	newStatusOnSend?: string;
}

export async function sendEmailToLead(params: SendEmailParams) {
	const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
	const defaultFromEmail = env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'info@payjeezy.com';

	const { leadId, templateId, sender = defaultFromEmail, subject, bodyHtml, newStatusOnSend } = params;

	// Fetch lead details
	const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
	if (!lead) {
		throw new Error(`Lead with ID ${leadId} not found`);
	}

	const recipient = lead.email;
	let deliveryStatus = 'SENT';

	try {
		if (resendApiKey) {
			const resend = new Resend(resendApiKey);
			const fromAddress = sender.includes('<') ? sender : `Payjeezy CRM <${sender}>`;
			console.log(`[RESEND SENDING] Attempting to send email via Resend API key to ${recipient} from ${fromAddress}...`);

			const { data, error } = await resend.emails.send({
				from: fromAddress,
				to: [recipient],
				subject,
				html: bodyHtml
			});

			if (error) {
				console.error('Resend API returned error:', error);
				deliveryStatus = 'FAILED';
			} else {
				console.log(`[RESEND SUCCESS] Sent email to ${recipient} (Resend ID: ${data?.id})`);
				deliveryStatus = 'DELIVERED';
			}
		} else {
			console.warn(`[RESEND SIMULATION] RESEND_API_KEY is not configured in environment! Email to ${recipient} was not actually dispatched.`);
			deliveryStatus = 'SIMULATED';
		}
	} catch (err) {
		console.error('Email send failed with exception:', err);
		deliveryStatus = 'FAILED';
	}

	const now = new Date().toISOString();

	// Log in email_logs
	const [insertedLog] = await db
		.insert(emailLogs)
		.values({
			leadId,
			templateId: templateId || null,
			sender: sender || defaultFromEmail,
			recipient,
			subject,
			bodyHtml,
			status: deliveryStatus,
			direction: 'OUTBOUND',
			sentAt: now
		})
		.returning();

	// Update lead status if requested or default to EMAILED if status was NEW
	const targetStatus = newStatusOnSend || (lead.status === 'NEW' ? 'EMAILED' : lead.status);
	if (targetStatus !== lead.status) {
		await db
			.update(leads)
			.set({
				status: targetStatus,
				updatedAt: now
			})
			.where(eq(leads.id, leadId));
	}

	return { success: deliveryStatus === 'DELIVERED', status: deliveryStatus, log: insertedLog };
}

export interface SendDirectEmailParams {
	to: string | string[];
	sender?: string;
	subject: string;
	bodyHtml: string;
}

export async function sendDirectEmail(params: SendDirectEmailParams) {
	const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
	const defaultFromEmail = env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'info@payjeezy.com';

	const { to, sender = defaultFromEmail, subject, bodyHtml } = params;
	const recipients = Array.isArray(to) ? to : [to];

	if (!resendApiKey) {
		console.warn(`[RESEND SIMULATION] RESEND_API_KEY not set. Email to ${recipients.join(', ')} simulated.`);
		return { success: false, status: 'SIMULATED' };
	}

	try {
		const resend = new Resend(resendApiKey);
		const fromAddress = sender.includes('<') ? sender : `Payjeezy CRM <${sender}>`;
		console.log(`[RESEND SENDING] Sending direct email to ${recipients.join(', ')} from ${fromAddress}...`);

		const { data, error } = await resend.emails.send({
			from: fromAddress,
			to: recipients,
			subject,
			html: bodyHtml
		});

		if (error) {
			console.error('Resend API error:', error);
			return { success: false, error };
		}
		console.log(`[RESEND SUCCESS] Sent direct email to ${recipients.join(', ')} (ID: ${data?.id})`);
		return { success: true, id: data?.id };
	} catch (err) {
		console.error('sendDirectEmail exception:', err);
		return { success: false, error: err };
	}
}

