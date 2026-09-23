import { fail, type Actions } from '@sveltejs/kit';
import { getIntakeCmsSections, updateCmsSection, duplicateCmsSection, deleteCmsSection } from '$lib/server/cms';
import { getAllVerticals } from '$lib/server/verticals';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const allVerticals = await getAllVerticals();
	const activeVerticalId = url.searchParams.get('vertical') || (allVerticals[0]?.id || '');
	const { sections, sectionOrder, verticalName } = await getIntakeCmsSections(activeVerticalId);

	return {
		sections,
		sectionOrder,
		allVerticals,
		activeVerticalId,
		verticalName
	};
};

export const actions: Actions = {
	saveSection: async ({ request }) => {
		const formData = await request.formData();
		const verticalId = formData.get('verticalId')?.toString() || '';
		const sectionId = formData.get('sectionId')?.toString();
		const title = formData.get('title')?.toString().trim();
		const subtitle = formData.get('subtitle')?.toString().trim() || '';
		const rawContentJson = formData.get('contentJson')?.toString();

		if (!sectionId || !title || !rawContentJson) {
			return fail(400, { error: 'Section ID, Title, and Content JSON are required.' });
		}

		try {
			const content = JSON.parse(rawContentJson);
			await updateCmsSection(verticalId, sectionId, title, subtitle, content);
			return {
				success: true,
				message: `Section updated successfully!`,
				savedSectionId: sectionId
			};
		} catch (err: any) {
			console.error('Failed to save CMS section:', err);
			return fail(400, { error: 'Invalid JSON content format or database error.' });
		}
	},

	saveSectionOrder: async ({ request }) => {
		const formData = await request.formData();
		const verticalId = formData.get('verticalId')?.toString() || 'mmj-dispensary';
		const orderJson = formData.get('orderJson')?.toString();

		if (!orderJson) {
			return fail(400, { error: 'Order JSON is required.' });
		}

		try {
			const orderList = JSON.parse(orderJson);
			await updateCmsSection(verticalId, 'section_order', 'Section Order Configuration', 'Custom section layout order for public intake page', { order: orderList });
			return {
				success: true,
				message: `Funnel section layout order for ${verticalId} updated successfully!`
			};
		} catch (err: any) {
			console.error('Failed to save section order:', err);
			return fail(400, { error: 'Database error saving section order.' });
		}
	},

	duplicateSection: async ({ request }) => {
		const formData = await request.formData();
		const verticalId = formData.get('verticalId')?.toString() || 'mmj-dispensary';
		const sectionId = formData.get('sectionId')?.toString();

		if (!sectionId) {
			return fail(400, { error: 'Section ID to duplicate is required.' });
		}

		try {
			const result = await duplicateCmsSection(verticalId, sectionId);
			return {
				success: true,
				message: `Section duplicated successfully! New Section: ${result.sectionName}`,
				newSectionId: result.newSectionId
			};
		} catch (err: any) {
			console.error('Failed to duplicate section:', err);
			return fail(400, { error: err?.message || 'Failed to duplicate section.' });
		}
	},

	deleteSection: async ({ request }) => {
		const formData = await request.formData();
		const verticalId = formData.get('verticalId')?.toString() || 'mmj-dispensary';
		const sectionId = formData.get('sectionId')?.toString();

		if (!sectionId) {
			return fail(400, { error: 'Section ID to delete is required.' });
		}

		try {
			await deleteCmsSection(verticalId, sectionId);
			return {
				success: true,
				message: `Section deleted successfully!`
			};
		} catch (err: any) {
			console.error('Failed to delete section:', err);
			return fail(400, { error: err?.message || 'Failed to delete section.' });
		}
	}
};
