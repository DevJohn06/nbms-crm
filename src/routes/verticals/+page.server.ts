import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAllVerticals, createVertical, updateVertical, deleteVertical } from '$lib/server/verticals';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !['SUPER_ADMIN', 'ADMIN'].includes(locals.user.role)) {
		throw redirect(303, '/?error=unauthorized');
	}

	const verticalsList = await getAllVerticals();

	return {
		verticalsList
	};
};

export const actions: Actions = {
	createVertical: async ({ request, locals }) => {
		if (!locals.user || !['SUPER_ADMIN', 'ADMIN'].includes(locals.user.role)) {
			return fail(403, { error: 'Unauthorized to create verticals.' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const slug = formData.get('slug')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const subdomain = formData.get('subdomain')?.toString().trim();
		const themeColor = formData.get('themeColor')?.toString().trim();

		if (!name) {
			return fail(400, { error: 'Vertical name is required.' });
		}

		try {
			const created = await createVertical({
				name,
				slug,
				description,
				subdomain,
				themeColor
			});

			return {
				success: true,
				message: `Vertical "${created.name}" created successfully with instant landing page funnel!`
			};
		} catch (err: any) {
			console.error('Error creating vertical:', err);
			return fail(400, { error: err.message || 'Failed to create vertical.' });
		}
	},

	updateVertical: async ({ request, locals }) => {
		if (!locals.user || !['SUPER_ADMIN', 'ADMIN'].includes(locals.user.role)) {
			return fail(403, { error: 'Unauthorized to update verticals.' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString().trim();
		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const subdomain = formData.get('subdomain')?.toString().trim();
		const themeColor = formData.get('themeColor')?.toString().trim();

		if (!id || !name) {
			return fail(400, { error: 'Vertical ID and Name are required.' });
		}

		try {
			await updateVertical(id, {
				name,
				description,
				subdomain,
				themeColor
			});

			return {
				success: true,
				message: `Vertical "${name}" updated successfully.`
			};
		} catch (err: any) {
			console.error('Error updating vertical:', err);
			return fail(400, { error: err.message || 'Failed to update vertical.' });
		}
	},

	deleteVertical: async ({ request, locals }) => {
		if (!locals.user || !['SUPER_ADMIN', 'ADMIN'].includes(locals.user.role)) {
			return fail(403, { error: 'Unauthorized to delete verticals.' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString().trim();

		if (!id) {
			return fail(400, { error: 'Vertical ID is required.' });
		}

		try {
			await deleteVertical(id);
			return {
				success: true,
				message: 'Vertical removed successfully.'
			};
		} catch (err: any) {
			console.error('Error deleting vertical:', err);
			return fail(400, { error: err.message || 'Failed to delete vertical.' });
		}
	}
};
