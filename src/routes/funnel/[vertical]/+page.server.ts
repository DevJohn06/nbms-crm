import { fail, error, type Actions } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { contracts, bookedCalls } from '$lib/server/db/schema';
import { getIntakeCmsSections } from '$lib/server/cms';
import { sendEmailToLead } from '$lib/server/email';
import { upsertOrCollateLead } from '$lib/server/leads';
import { getVerticalBySlug } from '$lib/server/verticals';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const verticalSlug = params.vertical;
	const vertical = await getVerticalBySlug(verticalSlug);

	if (!vertical) {
		throw error(404, `Industry vertical '${verticalSlug}' was not found.`);
	}

	const { sections, sectionOrder } = await getIntakeCmsSections(verticalSlug);
	return {
		cms: sections,
		sectionOrder,
		vertical
	};
};

export const actions: Actions = {
	submitGetInfo: async ({ request, params }) => {
		const verticalSlug = params.vertical || 'mmj-dispensary';
		const formData = await request.formData();

		const businessName = formData.get('businessName')?.toString().trim();
		const representativeName = formData.get('representativeName')?.toString().trim();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const phone = formData.get('phone')?.toString().trim();
		const monthlyVolume = formData.get('monthlyVolume')?.toString().trim();
		const notes = formData.get('notes')?.toString().trim();

		if (!businessName || !email || !phone) {
			return fail(400, { error: 'Business name, email address, and phone number are required.' });
		}

		try {
			const leadRes = await upsertOrCollateLead({
				businessName,
				email,
				phone,
				status: 'NEW',
				verticalId: verticalSlug,
				notes: notes || `Inquiry Intake Form (${verticalSlug}). Representative: ${representativeName || 'N/A'}. Monthly Volume: ${monthlyVolume || 'Not specified'}`,
				customFields: JSON.stringify({
					Representative: representativeName || businessName,
					MonthlyVolume: monthlyVolume || 'N/A',
					FormType: 'Get Info CTA',
					Vertical: verticalSlug
				})
			});

			const leadId = leadRes.id;
			const clientName = representativeName || businessName;
			const fromEmail = env.RESEND_FROM_EMAIL || 'sales@nbmsinc.com';
			const emailSubject = `We've received your request – NBMS Merchant Services`;
			const emailBody = `
				<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #ffffff;">
					<div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #1f71c1;">
						<h2 style="color: #1f71c1; margin: 0;">NBMS Merchant Services</h2>
						<p style="font-size: 12px; color: #64748b; margin-top: 4px;">Next-Day Settlement & Transparent Interchange Processing</p>
					</div>

					<div style="padding: 20px 0;">
						<h3 style="color: #0f172a; margin-top: 0;">Inquiry Received!</h3>
						<p>Hi <strong>${clientName}</strong>,</p>
						<p>Thank you for reaching out to NBMS! We have successfully received your information request for <strong>${businessName}</strong>.</p>
						<p>Our dedicated onboarding specialist is currently reviewing your merchant profile and will reach out to you directly at <strong>${phone}</strong> or <strong>${email}</strong> within 1 business hour to provide your customized processing rate quote.</p>

						<div style="background-color: #f8fafc; border-left: 4px solid #1f71c1; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
							<p style="margin: 0; font-size: 13px; font-weight: bold; color: #334155;">Inquiry Summary:</p>
							<ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #475569;">
								<li><strong>Business Name:</strong> ${businessName}</li>
								<li><strong>Est. Monthly Volume:</strong> ${monthlyVolume || 'Standard Processing Tier'}</li>
								<li><strong>Industry Vertical:</strong> ${verticalSlug}</li>
								<li><strong>Reference Lead ID:</strong> #${leadId}</li>
							</ul>
						</div>
					</div>

					<div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8;">
						NBMS CRM & Merchant Solutions © 2026.
					</div>
				</div>
			`;

			await sendEmailToLead({
				leadId,
				sender: fromEmail,
				subject: emailSubject,
				bodyHtml: emailBody,
				newStatusOnSend: 'EMAILED'
			});

			return { success: true, actionType: 'getInfo', businessName };
		} catch (err: any) {
			console.error('Error submitting get info form:', err);
			return fail(500, { error: err?.message || 'Failed to submit inquiry.' });
		}
	},

	bookCall: async ({ request, params }) => {
		const verticalSlug = params.vertical || 'mmj-dispensary';
		const formData = await request.formData();

		const clientName = formData.get('clientName')?.toString().trim();
		const businessName = formData.get('businessName')?.toString().trim();
		const clientEmail = formData.get('clientEmail')?.toString().trim().toLowerCase();
		const clientPhone = formData.get('clientPhone')?.toString().trim();
		const callDate = formData.get('callDate')?.toString().trim();
		const meetingType = formData.get('meetingType')?.toString().trim() || 'Merchant Strategy Session';
		const callPreference = formData.get('callPreference')?.toString().trim() || 'Direct Call';
		const timezone = formData.get('timezone')?.toString().trim() || 'Eastern Time (ET)';
		const notes = formData.get('notes')?.toString().trim();

		if (!clientName || !clientEmail || !callDate) {
			return fail(400, { error: 'Full name, email address, and preferred call date/time are required.' });
		}

		try {
			const now = new Date().toISOString();
			const leadNotes = `Booked Strategy Call: ${meetingType} (${callPreference}, ${timezone}) scheduled for ${callDate}.${notes ? ` Notes: ${notes}` : ''}`;
			const leadRes = await upsertOrCollateLead({
				businessName: businessName || clientName,
				email: clientEmail,
				phone: clientPhone || 'N/A',
				status: 'CONTACTED',
				verticalId: verticalSlug,
				notes: leadNotes,
				customFields: JSON.stringify({
					BookedCallDate: callDate,
					MeetingType: meetingType,
					CallPreference: callPreference,
					Timezone: timezone,
					Vertical: verticalSlug
				})
			});

			const leadId = leadRes.id;
			const callNotes = [
				`Format: ${callPreference}`,
				`Timezone: ${timezone}`,
				`Vertical: ${verticalSlug}`,
				notes
			].filter(Boolean).join(' | ');

			await db.insert(bookedCalls).values({
				verticalId: verticalSlug,
				leadId,
				clientName,
				clientEmail,
				clientPhone: clientPhone || null,
				businessName: businessName || null,
				callDate,
				meetingType,
				notes: callNotes || null,
				status: 'SCHEDULED',
				createdAt: now
			});

			const emailSubject = `Call Confirmed: ${meetingType} with NBMS Specialist`;
			const fromEmail = env.RESEND_FROM_EMAIL || 'sales@nbmsinc.com';
			const connectionInstruction = callPreference === 'Zoom Call'
				? `A video conference link will be sent to <strong>${clientEmail}</strong> prior to the meeting.`
				: `Our consultant will call you directly at <strong>${clientPhone || clientEmail}</strong> at the scheduled time.`;

			const emailBody = `
				<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #ffffff;">
					<div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #1f71c1;">
						<h2 style="color: #1f71c1; margin: 0;">NBMS Strategy Session Confirmed</h2>
						<p style="font-size: 12px; color: #64748b; margin-top: 4px;">Merchant Consulting & Interchange Optimization</p>
					</div>
					<div style="padding: 20px 0;">
						<p>Hi <strong>${clientName}</strong>,</p>
						<p>Thank you for scheduling a strategy session with NBMS! Your appointment details are outlined below:</p>

						<div style="background-color: #f0f7fc; border: 1px solid #dbe7f1; padding: 16px; border-radius: 8px; margin: 16px 0;">
							<p style="margin: 0; font-size: 14px; font-weight: bold; color: #1f71c1;">📅 Session Details:</p>
							<table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse; margin-top: 8px;">
								<tr><td style="padding: 4px 0; font-weight: bold; width: 120px;">Topic:</td><td>${meetingType}</td></tr>
								<tr><td style="padding: 4px 0; font-weight: bold;">Format:</td><td>${callPreference}</td></tr>
								<tr><td style="padding: 4px 0; font-weight: bold;">Date & Time:</td><td><strong>${new Date(callDate).toLocaleString()}</strong> (${timezone})</td></tr>
								<tr><td style="padding: 4px 0; font-weight: bold;">Host:</td><td>Senior Merchant Consultant (NBMS)</td></tr>
							</table>
						</div>

						<p style="font-size: 13px; color: #475569;">${connectionInstruction}</p>
					</div>

					<div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8;">
						NBMS CRM & Merchant Solutions © 2026. All rights reserved.
					</div>
				</div>
			`;

			await sendEmailToLead({
				leadId,
				sender: fromEmail,
				subject: emailSubject,
				bodyHtml: emailBody,
				newStatusOnSend: 'CONTACTED'
			});

			return {
				success: true,
				actionType: 'bookCall',
				clientName,
				callDate
			};
		} catch (err: any) {
			console.error('Error booking call:', err);
			return fail(500, { error: err?.message || 'Failed to schedule call.' });
		}
	},

	submitIntake: async ({ request, params }) => {
		const verticalSlug = params.vertical || 'mmj-dispensary';
		const formData = await request.formData();

		const businessName = formData.get('businessName')?.toString().trim();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const phone = formData.get('phone')?.toString().trim();
		const selectedPackage = formData.get('selectedPackage')?.toString().trim() || 'Growth Pro Merchant Package';
		const monthlyFee = formData.get('monthlyFee')?.toString().trim() || '$199 / month';
		const representativeName = formData.get('representativeName')?.toString().trim();
		const signatureData = formData.get('signatureData')?.toString();
		const notes = formData.get('notes')?.toString().trim();

		if (!businessName || !email || !phone) {
			return fail(400, { error: 'Business name, email address, and phone number are required.' });
		}

		try {
			const now = new Date().toISOString();
			const leadRes = await upsertOrCollateLead({
				businessName,
				email,
				phone,
				status: 'CONTRACT_SENT',
				verticalId: verticalSlug,
				notes: notes || `Package Selected: ${selectedPackage} (${monthlyFee}). Representative: ${representativeName || 'N/A'}`
			});

			const leadId = leadRes.id;
			const contractId = `PAY-CON-${Math.floor(100000 + Math.random() * 900000)}`;
			await db.insert(contracts).values({
				id: contractId,
				leadId,
				clientName: representativeName || businessName,
				clientEmail: email,
				servicePackage: selectedPackage,
				monthlyFee,
				contractTerms: `Package: ${selectedPackage}. Monthly Fee: ${monthlyFee}. Vertical: ${verticalSlug}`,
				status: signatureData ? 'SIGNED' : 'PENDING_SIGNATURE',
				signatureData: signatureData || null,
				createdAt: now,
				signedAt: signatureData ? now : null
			});

			return { success: true, actionType: 'intake', businessName };
		} catch (err: any) {
			console.error('Error submitting intake:', err);
			return fail(500, { error: err?.message || 'Failed to submit intake application.' });
		}
	}
};
