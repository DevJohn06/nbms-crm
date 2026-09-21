import { db } from '$lib/server/db';
import { leads } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export interface LeadInput {
	businessName: string;
	email: string;
	secondaryEmail?: string;
	phone: string;
	status?: string;
	notes?: string;
	customFields?: string;
	verticalId?: string;
}

export function normalizeBusinessName(name: string): string {
	return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Split comma/semicolon/whitespace/newline separated email strings into a single primary email and alt emails.
 */
export function sanitizeLeadEmail(emailStr: string): { primary: string; secondary: string[] } {
	if (!emailStr) return { primary: 'no-email@provided.com', secondary: [] };
	const trimmed = emailStr.trim();
	if (trimmed.toLowerCase() === 'no email address' || trimmed.toLowerCase() === 'no-email@provided.com') {
		return { primary: 'No email address', secondary: [] };
	}

	const tokens = trimmed
		.split(/[\s,;]+/)
		.map((e) => e.trim().replace(/^[<(\[]+|[>)\]]+$/g, ''))
		.filter((e) => e.includes('@'));

	if (tokens.length === 0) {
		return { primary: trimmed || 'no-email@provided.com', secondary: [] };
	}

	const uniqueEmails = Array.from(new Set(tokens));
	return {
		primary: uniqueEmails[0],
		secondary: uniqueEmails.slice(1)
	};
}

/**
 * Upsert or Collate a Lead into the database by Business Name scoped to a vertical.
 */
export async function upsertOrCollateLead(input: LeadInput): Promise<{ id: number; action: 'created' | 'collated' }> {
	const rawName = (input.businessName || '').trim();
	if (!rawName) {
		throw new Error('Business Name is required.');
	}

	const verticalId = input.verticalId || 'mmj-dispensary';
	const normName = normalizeBusinessName(rawName);
	const now = new Date().toISOString();

	const parsedEmail = sanitizeLeadEmail(input.email);
	let inputPrimaryEmail = parsedEmail.primary;
	const inputAltEmails = [...parsedEmail.secondary];

	if (input.secondaryEmail) {
		const parsedSec = sanitizeLeadEmail(input.secondaryEmail);
		if (parsedSec.primary && parsedSec.primary !== 'No email address' && parsedSec.primary !== 'no-email@provided.com') {
			if (!inputAltEmails.includes(parsedSec.primary) && parsedSec.primary !== inputPrimaryEmail) {
				inputAltEmails.push(parsedSec.primary);
			}
		}
		for (const sec of parsedSec.secondary) {
			if (!inputAltEmails.includes(sec) && sec !== inputPrimaryEmail) {
				inputAltEmails.push(sec);
			}
		}
	}

	// Fetch leads in this vertical to check for normalized business name match
	const verticalLeads = await db.select().from(leads).where(eq(leads.verticalId, verticalId));
	const existing = verticalLeads.find((l) => normalizeBusinessName(l.businessName) === normName);

	if (!existing) {
		const initialNotes = input.notes || '';
		let finalNotes = initialNotes;
		if (inputAltEmails.length > 0) {
			const altNote = `[Collated Contact]: Alt Email: ${inputAltEmails.join(', ')}`;
			finalNotes = finalNotes ? `${finalNotes}\n\n${altNote}` : altNote;
		}

		// Insert new lead
		const [inserted] = await db
			.insert(leads)
			.values({
				verticalId,
				businessName: rawName,
				email: inputPrimaryEmail,
				secondaryEmail: inputAltEmails.length > 0 ? inputAltEmails.join(', ') : null,
				phone: (input.phone || 'N/A').trim(),
				status: input.status || 'NEW',
				notes: finalNotes,
				customFields: input.customFields || null,
				createdAt: now,
				updatedAt: now
			})
			.returning();

		return { id: inserted.id, action: 'created' };
	} else {
		// Collate into existing lead record
		let primaryEmail = existing.email;

		// Clean up existing primary email if it contains multiple emails
		const existingCleaned = sanitizeLeadEmail(existing.email);
		primaryEmail = existingCleaned.primary;
		const altEmails: string[] = [...existingCleaned.secondary];

		if (existing.secondaryEmail) {
			const existingSecCleaned = sanitizeLeadEmail(existing.secondaryEmail);
			if (existingSecCleaned.primary && existingSecCleaned.primary !== 'No email address' && existingSecCleaned.primary !== 'no-email@provided.com') {
				if (!altEmails.includes(existingSecCleaned.primary) && existingSecCleaned.primary !== primaryEmail) {
					altEmails.push(existingSecCleaned.primary);
				}
			}
			for (const sec of existingSecCleaned.secondary) {
				if (!altEmails.includes(sec) && sec !== primaryEmail) {
					altEmails.push(sec);
				}
			}
		}

		if ((primaryEmail === 'no-email@provided.com' || !primaryEmail) && inputPrimaryEmail && inputPrimaryEmail !== 'no-email@provided.com') {
			primaryEmail = inputPrimaryEmail;
		} else if (inputPrimaryEmail && inputPrimaryEmail !== 'no-email@provided.com' && inputPrimaryEmail.toLowerCase() !== primaryEmail.toLowerCase()) {
			if (!altEmails.includes(inputPrimaryEmail)) altEmails.push(inputPrimaryEmail);
		}

		for (const alt of inputAltEmails) {
			if (alt !== primaryEmail && !altEmails.includes(alt)) altEmails.push(alt);
		}

		let primaryPhone = existing.phone;
		const inputPhone = (input.phone || '').trim();
		const altPhones: string[] = [];

		if ((primaryPhone === 'N/A' || !primaryPhone) && inputPhone && inputPhone !== 'N/A') {
			primaryPhone = inputPhone;
		} else if (inputPhone && inputPhone !== 'N/A' && inputPhone !== primaryPhone) {
			altPhones.push(inputPhone);
		}

		// Compile collated notes
		const noteParts: string[] = [];
		if (existing.notes && existing.notes.trim()) {
			noteParts.push(existing.notes.trim());
		}

		if (altEmails.length > 0) {
			const altEmailStr = `Alt Email: ${altEmails.join(', ')}`;
			if (!noteParts.some((n) => n.includes(altEmailStr))) {
				noteParts.push(`[Collated Contact]: ${altEmailStr}`);
			}
		}

		if (altPhones.length > 0) {
			const altPhoneStr = `Alt Phone: ${altPhones.join(', ')}`;
			if (!noteParts.some((n) => n.includes(altPhoneStr))) {
				noteParts.push(`[Collated Contact]: ${altPhoneStr}`);
			}
		}

		if (input.notes && input.notes.trim() && !noteParts.some((n) => n.includes(input.notes!.trim()))) {
			noteParts.push(`[Collated Note]: ${input.notes.trim()}`);
		}

		// Merge customFields JSON if present
		let mergedCustomFields = existing.customFields;
		if (input.customFields) {
			try {
				const existingObj = existing.customFields ? JSON.parse(existing.customFields) : {};
				const newObj = JSON.parse(input.customFields);
				mergedCustomFields = JSON.stringify({ ...existingObj, ...newObj });
			} catch {
				// ignore invalid json
			}
		}

		await db
			.update(leads)
			.set({
				email: primaryEmail,
				secondaryEmail: altEmails.length > 0 ? altEmails.join(', ') : null,
				phone: primaryPhone,
				notes: noteParts.join('\n\n'),
				customFields: mergedCustomFields,
				updatedAt: now
			})
			.where(eq(leads.id, existing.id));

		return { id: existing.id, action: 'collated' };
	}
}

/**
 * Deduplicate and collate batch of lead inputs (e.g. from CSV file upload).
 */
export async function processLeadBatch(
	batch: LeadInput[],
	defaultVerticalId?: string
): Promise<{ totalProcessed: number; createdCount: number; collatedCount: number }> {
	let createdCount = 0;
	let collatedCount = 0;

	// Collapse duplicates within the incoming CSV batch itself per vertical
	const collatedMap = new Map<string, LeadInput>();

	for (const item of batch) {
		const rawName = (item.businessName || '').trim();
		if (!rawName) continue;
		const normName = normalizeBusinessName(rawName);
		const targetVerticalId = item.verticalId || defaultVerticalId || 'mmj-dispensary';
		const mapKey = `${targetVerticalId}__${normName}`;

		if (!collatedMap.has(mapKey)) {
			collatedMap.set(mapKey, {
				verticalId: targetVerticalId,
				businessName: rawName,
				email: (item.email || '').trim(),
				secondaryEmail: (item.secondaryEmail || '').trim() || undefined,
				phone: (item.phone || '').trim(),
				status: item.status || 'NEW',
				notes: item.notes || '',
				customFields: item.customFields
			});
		} else {
			const existingItem = collatedMap.get(mapKey)!;
			const notesArr: string[] = [];
			if (existingItem.notes) notesArr.push(existingItem.notes);

			if (item.email && item.email !== existingItem.email) {
				if (!existingItem.secondaryEmail) {
					existingItem.secondaryEmail = item.email;
				} else if (!existingItem.secondaryEmail.includes(item.email)) {
					existingItem.secondaryEmail = `${existingItem.secondaryEmail}, ${item.email}`;
				}
			}
			if (item.secondaryEmail && item.secondaryEmail !== existingItem.email) {
				if (!existingItem.secondaryEmail) {
					existingItem.secondaryEmail = item.secondaryEmail;
				} else if (!existingItem.secondaryEmail.includes(item.secondaryEmail)) {
					existingItem.secondaryEmail = `${existingItem.secondaryEmail}, ${item.secondaryEmail}`;
				}
			}
			if (item.phone && item.phone !== existingItem.phone) {
				notesArr.push(`Alt Phone: ${item.phone}`);
			}
			if (item.notes && !notesArr.includes(item.notes)) {
				notesArr.push(item.notes);
			}

			existingItem.notes = notesArr.join('\n');
		}
	}

	for (const input of collatedMap.values()) {
		const result = await upsertOrCollateLead(input);
		if (result.action === 'created') createdCount++;
		else if (result.action === 'collated') collatedCount++;
	}

	return {
		totalProcessed: collatedMap.size,
		createdCount,
		collatedCount
	};
}

/**
 * Maintenance Utility: Deduplicate existing leads table by merging duplicate business names & splitting comma-separated emails scoped by vertical.
 */
export async function deduplicateDatabaseLeads(targetVerticalId?: string): Promise<{ cleaned: number }> {
	const allLeads = targetVerticalId
		? await db.select().from(leads).where(eq(leads.verticalId, targetVerticalId)).orderBy(leads.id)
		: await db.select().from(leads).orderBy(leads.id);
	const seenMap = new Map<string, typeof leads.$inferSelect>();
	const toDeleteIds: number[] = [];

	for (const lead of allLeads) {
		const norm = normalizeBusinessName(lead.businessName);
		const vId = lead.verticalId || 'mmj-dispensary';
		const seenKey = `${vId}__${norm}`;
		const sanitized = sanitizeLeadEmail(lead.email);

		if (!seenMap.has(seenKey)) {
			const updatedMaster = { ...lead, email: sanitized.primary };
			seenMap.set(seenKey, updatedMaster);

			// Clean up multi-email strings in primary record
			if (sanitized.secondary.length > 0 || lead.email !== sanitized.primary) {
				const notes: string[] = [];
				if (lead.notes) notes.push(lead.notes);
				const existingSec = lead.secondaryEmail ? sanitizeLeadEmail(lead.secondaryEmail) : { primary: '', secondary: [] };
				const secSet = new Set<string>([...sanitized.secondary]);
				if (existingSec.primary && existingSec.primary !== 'no-email@provided.com' && existingSec.primary !== 'No email address') {
					secSet.add(existingSec.primary);
				}
				existingSec.secondary.forEach(s => secSet.add(s));
				secSet.delete(sanitized.primary);

				await db
					.update(leads)
					.set({
						email: sanitized.primary,
						secondaryEmail: secSet.size > 0 ? Array.from(secSet).join(', ') : null,
						notes: notes.join('\n\n'),
						updatedAt: new Date().toISOString()
					})
					.where(eq(leads.id, lead.id));
			}
		} else {
			// Collate into original lead record
			const original = seenMap.get(norm)!;
			toDeleteIds.push(lead.id);

			const notes: string[] = [];
			if (original.notes) notes.push(original.notes);
			if (sanitized.primary && sanitized.primary !== original.email && sanitized.primary !== 'no-email@provided.com') {
				notes.push(`[Collated Contact]: Alt Email: ${sanitized.primary}`);
			}
			for (const alt of sanitized.secondary) {
				notes.push(`[Collated Contact]: Alt Email: ${alt}`);
			}
			if (lead.phone && lead.phone !== original.phone && lead.phone !== 'N/A') {
				notes.push(`[Collated Contact]: Alt Phone: ${lead.phone}`);
			}
			if (lead.notes && !notes.includes(lead.notes)) notes.push(lead.notes);

			const secSet = new Set<string>();
			if (original.secondaryEmail) {
				const existingSec = sanitizeLeadEmail(original.secondaryEmail);
				if (existingSec.primary && existingSec.primary !== 'no-email@provided.com' && existingSec.primary !== 'No email address') secSet.add(existingSec.primary);
				existingSec.secondary.forEach((s) => secSet.add(s));
			}
			if (sanitized.primary && sanitized.primary !== original.email && sanitized.primary !== 'no-email@provided.com') {
				secSet.add(sanitized.primary);
			}
			for (const alt of sanitized.secondary) {
				secSet.add(alt);
			}
			secSet.delete(original.email);

			await db
				.update(leads)
				.set({
					secondaryEmail: secSet.size > 0 ? Array.from(secSet).join(', ') : null,
					notes: notes.join('\n\n'),
					updatedAt: new Date().toISOString()
				})
				.where(eq(leads.id, original.id));
		}
	}

	for (const id of toDeleteIds) {
		await db.delete(leads).where(eq(leads.id, id));
	}

	return { cleaned: toDeleteIds.length };
}
