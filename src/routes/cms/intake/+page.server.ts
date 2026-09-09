import { fail, type Actions } from '@sveltejs/kit';
import { getIntakeCmsSections, updateCmsSection } from '$lib/server/cms';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { sections, sectionOrder } = await getIntakeCmsSections();
	return {
		sections,
		sectionOrder
	};
};

export const actions: Actions = {
	saveSection: async ({ request }) => {
		const formData = await request.formData();
		const sectionId = formData.get('sectionId')?.toString();
		const title = formData.get('title')?.toString().trim();
		const subtitle = formData.get('subtitle')?.toString().trim() || '';
		const rawContentJson = formData.get('contentJson')?.toString();

		if (!sectionId || !title || !rawContentJson) {
			return fail(400, { error: 'Section ID, Title, and Content JSON are required.' });
		}

		try {
			const content = JSON.parse(rawContentJson);
			await updateCmsSection(sectionId, title, subtitle, content);
			return {
				success: true,
				message: `${sectionId.toUpperCase()} section updated successfully!`,
				savedSectionId: sectionId
			};
		} catch (err: any) {
			console.error('Failed to save CMS section:', err);
			return fail(400, { error: 'Invalid JSON content format or database error.' });
		}
	},

	saveSectionOrder: async ({ request }) => {
		const formData = await request.formData();
		const orderJson = formData.get('orderJson')?.toString();

		if (!orderJson) {
			return fail(400, { error: 'Order JSON is required.' });
		}

		try {
			const orderList = JSON.parse(orderJson);
			await updateCmsSection('section_order', 'Section Order Configuration', 'Custom section layout order for public intake page', { order: orderList });
			return {
				success: true,
				message: 'Funnel section layout order updated successfully!'
			};
		} catch (err: any) {
			console.error('Failed to save section order:', err);
			return fail(400, { error: 'Database error saving section order.' });
		}
	}
};
