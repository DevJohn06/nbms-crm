import { fail, type Actions } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { contracts, bookedCalls } from '$lib/server/db/schema';
import { getIntakeCmsSections } from '$lib/server/cms';
import { sendEmailToLead, sendDirectEmail } from '$lib/server/email';
import { upsertOrCollateLead } from '$lib/server/leads';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { sections, sectionOrder } = await getIntakeCmsSections();
	return {
		cms: sections,
		sectionOrder
	};
};

export const actions: Actions = {
	// CTA 1: Get Info Form Submission
	submitGetInfo: async ({ request }) => {
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
			// 1. Upsert or Collate lead by business name
			const leadRes = await upsertOrCollateLead({
				businessName,
				email,
				phone,
				status: 'NEW',
				notes: notes || `Inquiry Intake Form. Representative: ${representativeName || 'N/A'}. Monthly Volume: ${monthlyVolume || 'Not specified'}`,
				customFields: JSON.stringify({
					Representative: representativeName || businessName,
					MonthlyVolume: monthlyVolume || 'N/A',
					FormType: 'Get Info CTA'
				})
			});

			const leadId = leadRes.id;

			// 2. Send instant automated confirmation email citing receipt & promised follow-up
			const emailSubject = `We've received your request – Payjeezy Merchant Services`;
			const clientName = representativeName || businessName;
			const emailBody = `
				<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #ffffff;">
					<div style="text-align: center; padding-bottom: 20px; border-b: 2px solid #8b5cf6;">
						<h2 style="color: #6d28d9; margin: 0;">Payjeezy Merchant Services</h2>
						<p style="font-size: 12px; color: #64748b; margin-top: 4px;">Next-Day Settlement & Transparent Interchange Processing</p>
					</div>

					<div style="padding: 20px 0;">
						<h3 style="color: #0f172a; margin-top: 0;">Inquiry Received!</h3>
						<p>Hi <strong>${clientName}</strong>,</p>
						<p>Thank you for reaching out to Payjeezy! We have successfully received your information request for <strong>${businessName}</strong>.</p>
						<p>Our dedicated onboarding specialist is currently reviewing your merchant profile and will reach out to you directly at <strong>${phone}</strong> or <strong>${email}</strong> within 1 business hour to provide your customized processing rate quote.</p>

						<div style="background-color: #f8fafc; border-left: 4px solid #8b5cf6; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
							<p style="margin: 0; font-size: 13px; font-weight: bold; color: #334155;">Inquiry Summary:</p>
							<ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #475569;">
								<li><strong>Business Name:</strong> ${businessName}</li>
								<li><strong>Est. Monthly Volume:</strong> ${monthlyVolume || 'Standard Processing Tier'}</li>
								<li><strong>Reference Lead ID:</strong> #${leadId}</li>
							</ul>
						</div>

						<p style="font-size: 13px; color: #475569;">Need immediate assistance? Reply directly to this email or call our priority onboarding desk at +1 (800) 555-PAYJ.</p>
					</div>

					<div style="text-align: center; border-t: 1px solid #e2e8f0; pt: 16px; font-size: 11px; color: #94a3b8;">
						Payjeezy CRM & Merchant Solutions © 2026. All rights reserved.
					</div>
				</div>
			`;

			await sendEmailToLead({
				leadId,
				sender: 'info@payjeezy.com',
				subject: emailSubject,
				bodyHtml: emailBody,
				newStatusOnSend: 'NEW'
			});

			return {
				success: true,
				actionType: 'getInfo',
				businessName,
				email
			};
		} catch (err: any) {
			console.error('Error in submitGetInfo:', err);
			return fail(500, { error: err?.message || 'Failed to submit inquiry form.' });
		}
	},

	// CTA 2: Book A Call Form Submission / Calendly Scheduler
	bookCall: async ({ request }) => {
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

			// 1. Upsert or Collate lead by business name / client name
			const leadNotes = `Booked Strategy Call: ${meetingType} (${callPreference}, ${timezone}) scheduled for ${callDate}.${notes ? ` Notes: ${notes}` : ''}`;
			const leadRes = await upsertOrCollateLead({
				businessName: businessName || clientName,
				email: clientEmail,
				phone: clientPhone || 'N/A',
				status: 'CONTACTED',
				notes: leadNotes,
				customFields: JSON.stringify({
					BookedCallDate: callDate,
					MeetingType: meetingType,
					CallPreference: callPreference,
					Timezone: timezone
				})
			});

			const leadId = leadRes.id;

			// 2. Insert into booked_calls table
			const callNotes = [
				`Format: ${callPreference}`,
				`Timezone: ${timezone}`,
				notes
			].filter(Boolean).join(' | ');

			await db
				.insert(bookedCalls)
				.values({
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

			// 3. Send confirmation email
			const emailSubject = `Call Confirmed: ${meetingType} with Payjeezy Specialist`;
			const connectionInstruction = callPreference === 'Zoom Call'
				? `A video conference link will be sent to <strong>${clientEmail}</strong> prior to the meeting.`
				: `Our consultant will call you directly at <strong>${clientPhone || clientEmail}</strong> at the scheduled time.`;

			const emailBody = `
				<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #ffffff;">
					<div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #0891b2;">
						<h2 style="color: #0891b2; margin: 0;">Payjeezy Strategy Session Confirmed</h2>
						<p style="font-size: 12px; color: #64748b; margin-top: 4px;">Merchant Consulting & Interchange Optimization</p>
					</div>
					<div style="padding: 20px 0;">
						<p>Hi <strong>${clientName}</strong>,</p>
						<p>Thank you for scheduling a strategy session with Payjeezy! Your appointment details are outlined below:</p>

						<div style="background-color: #ecfeff; border: 1px solid #cff4fc; padding: 16px; border-radius: 8px; margin: 16px 0;">
							<p style="margin: 0; font-size: 14px; font-weight: bold; color: #0891b2;">📅 Session Details:</p>
							<table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse; margin-top: 8px;">
								<tr><td style="padding: 4px 0; font-weight: bold; width: 120px;">Topic:</td><td>${meetingType}</td></tr>
								<tr><td style="padding: 4px 0; font-weight: bold;">Format:</td><td>${callPreference}</td></tr>
								<tr><td style="padding: 4px 0; font-weight: bold;">Date & Time:</td><td><strong>${new Date(callDate).toLocaleString()}</strong> (${timezone})</td></tr>
								<tr><td style="padding: 4px 0; font-weight: bold;">Host:</td><td>Senior Merchant Consultant (Payjeezy)</td></tr>
							</table>
						</div>

						<p style="font-size: 13px; color: #475569;">${connectionInstruction}</p>

						<!-- Scheduling Notice Disclaimer -->
						<div style="background-color: #fefce8; border-left: 4px solid #eab308; border-radius: 4px; padding: 14px 16px; margin: 20px 0;">
							<p style="margin: 0; font-size: 13px; font-weight: bold; color: #854d0e;">💡 Scheduling Notice:</p>
							<p style="margin: 6px 0 0 0; font-size: 12.5px; line-height: 1.5; color: #713f12;">
								While our merchant advisory team operates 24/7, we kindly ask for a 1-business-day notice on all strategy sessions. This ensures our senior payments consultant can thoroughly analyze your business profile, evaluate underwriting risk parameters, and prepare a tailored interchange rate comparison prior to our meeting.
							</p>
							<p style="margin: 8px 0 0 0; font-size: 12px; color: #854d0e;">
								Need immediate priority onboarding or an earlier time? Please reply directly to this email.
							</p>
						</div>
					</div>

					<div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8;">
						Payjeezy CRM & Merchant Solutions © 2026. All rights reserved.
					</div>
				</div>
			`;

			await sendEmailToLead({
				leadId,
				sender: 'info@payjeezy.com',
				subject: emailSubject,
				bodyHtml: emailBody,
				newStatusOnSend: 'CONTACTED'
			});

			// 4. Send booking details alert to info@payjeezy.com
			const adminEmailSubject = `🎯 Strategy Session Booked: ${clientName} (${businessName || 'Merchant'})`;
			const adminEmailBody = `
				<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #ffffff;">
					<div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #eab308;">
						<h2 style="color: #ca8a04; margin: 0;">New Strategy Call Scheduled</h2>
						<p style="font-size: 13px; color: #64748b; margin-top: 4px;">Payjeezy CRM Booking Notification</p>
					</div>

					<div style="padding: 20px 0;">
						<p>A merchant has scheduled a strategy session via the website booking modal.</p>

						<div style="background-color: #fefce8; border: 1px solid #fef08a; padding: 16px; border-radius: 8px; margin: 16px 0;">
							<h3 style="margin-top: 0; color: #854d0e; font-size: 15px;">📅 Booking Details</h3>
							<table style="width: 100%; font-size: 13px; color: #334155; border-collapse: collapse;">
								<tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">Client Name:</td><td>${clientName}</td></tr>
								<tr><td style="padding: 6px 0; font-weight: bold;">Business Name:</td><td>${businessName || 'N/A'}</td></tr>
								<tr><td style="padding: 6px 0; font-weight: bold;">Email:</td><td><a href="mailto:${clientEmail}">${clientEmail}</a></td></tr>
								<tr><td style="padding: 6px 0; font-weight: bold;">Phone:</td><td><a href="tel:${clientPhone || ''}">${clientPhone || 'N/A'}</a></td></tr>
								<tr><td style="padding: 6px 0; font-weight: bold;">Scheduled Time:</td><td>${new Date(callDate).toLocaleString()}</td></tr>
								<tr><td style="padding: 6px 0; font-weight: bold;">Timezone:</td><td>${timezone}</td></tr>
								<tr><td style="padding: 6px 0; font-weight: bold;">Format:</td><td>${callPreference}</td></tr>
								<tr><td style="padding: 6px 0; font-weight: bold;">Meeting Topic:</td><td>${meetingType}</td></tr>
								<tr><td style="padding: 6px 0; font-weight: bold;">Lead ID:</td><td>#${leadId}</td></tr>
								${notes ? `<tr><td style="padding: 6px 0; font-weight: bold;">Notes:</td><td>${notes}</td></tr>` : ''}
							</table>
						</div>
					</div>

					<div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8;">
						Payjeezy CRM & Merchant Solutions © 2026.
					</div>
				</div>
			`;

			await sendDirectEmail({
				to: 'info@payjeezy.com',
				sender: 'info@payjeezy.com',
				subject: adminEmailSubject,
				bodyHtml: adminEmailBody
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

	// Tier Selection & Contract Intake
	submitIntake: async ({ request }) => {
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

			// 1. Upsert or Collate lead by business name
			const leadRes = await upsertOrCollateLead({
				businessName,
				email,
				phone,
				status: 'NEW',
				notes: notes || `Public Onboarding Application. Selected tier: ${selectedPackage}`,
				customFields: JSON.stringify({
					SelectedPackage: selectedPackage,
					MonthlyFee: monthlyFee,
					Representative: representativeName || businessName
				})
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
				contractTerms: 'Standard Payjeezy 12-Month Merchant Processing Service Agreement.',
				signatureData: signatureData || null,
				status: signatureData ? 'SIGNED' : 'PENDING_SIGNATURE',
				createdAt: now,
				signedAt: signatureData ? now : null
			});

			return {
				success: true,
				actionType: 'intake',
				businessName,
				leadId,
				contractId
			};
		} catch (err: any) {
			console.error('Error submitting intake:', err);
			return fail(500, { error: err?.message || 'Failed to submit onboarding application.' });
		}
	}
};
