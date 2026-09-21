import type { LayoutServerLoad } from './$types';
import { getUserAssignedVerticals, getAllVerticals } from '$lib/server/verticals';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	let assignedVerticals: Array<any> = [];
	let allVerticals: Array<any> = [];

	if (user) {
		assignedVerticals = await getUserAssignedVerticals(user.id);
		if (['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
			allVerticals = await getAllVerticals();
		}
	}

	const activeVerticalParam = url.searchParams.get('vertical') || null;

	return {
		user,
		assignedVerticals,
		allVerticals,
		activeVerticalParam
	};
};
