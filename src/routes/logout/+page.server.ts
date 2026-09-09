import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { SESSION_COOKIE_NAME, invalidateSession, deleteSessionCookie } from '$lib/server/auth/auth';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (token) {
		await invalidateSession(token);
		deleteSessionCookie(cookies);
	}
	throw redirect(303, '/login');
};

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE_NAME);
		if (token) {
			await invalidateSession(token);
			deleteSessionCookie(cookies);
		}
		throw redirect(303, '/login');
	}
};
