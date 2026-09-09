import { db } from '$lib/server/db';
import { emailTemplates } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const templates = await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
	return { templates };
};

export const actions: Actions = {
	saveTemplate: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const name = formData.get('name')?.toString().trim();
		const subject = formData.get('subject')?.toString().trim();
		const bodyHtml = formData.get('bodyHtml')?.toString();
		const triggerStage = formData.get('triggerStage')?.toString() || null;

		if (!name || !subject || !bodyHtml) {
			return fail(400, { error: 'Template Name, Subject, and Body content are required.' });
		}

		const now = new Date().toISOString();

		if (id) {
			await db
				.update(emailTemplates)
				.set({ name, subject, bodyHtml, triggerStage })
				.where(eq(emailTemplates.id, Number(id)));
		} else {
			await db.insert(emailTemplates).values({
				name,
				subject,
				bodyHtml,
				triggerStage,
				createdAt: now
			});
		}

		return { success: true };
	},

	deleteTemplate: async ({ request }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		if (!id) return fail(400, { error: 'Template ID required' });

		await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
		return { success: true };
	}
};
