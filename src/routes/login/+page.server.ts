import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { eq, or, sql } from 'drizzle-orm';
import { verifyPassword, createSession, setSessionCookie } from '$lib/server/auth/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const identifier = formData.get('email')?.toString().trim() || formData.get('username')?.toString().trim();
		const password = formData.get('password')?.toString();
		const redirectTo = url.searchParams.get('redirectTo') || '/';

		if (!identifier || !password) {
			return fail(400, {
				error: 'Username/Email and password are required',
				email: identifier
			});
		}

		try {
			// Query user by email OR name (case-insensitive)
			const [userRecord] = await db
				.select()
				.from(users)
				.where(
					or(
						eq(users.email, identifier.toLowerCase()),
						eq(sql`LOWER(${users.name})`, identifier.toLowerCase())
					)
				);

			if (!userRecord) {
				return fail(400, {
					error: 'Invalid credentials. Please verify your username/email and password.',
					email: identifier
				});
			}

			const isValidPassword = verifyPassword(password, userRecord.passwordHash);
			if (!isValidPassword) {
				return fail(400, {
					error: 'Invalid credentials. Please verify your username/email and password.',
					email: identifier
				});
			}

			const sessionToken = await createSession(userRecord.id);
			setSessionCookie(cookies, sessionToken);
		} catch (error) {
			console.error('Login action error:', error);
			return fail(500, {
				error: 'An unexpected system error occurred during authentication.',
				email: identifier
			});
		}

		throw redirect(303, redirectTo);
	}
};
