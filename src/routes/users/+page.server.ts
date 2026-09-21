import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq, desc, ne, and } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '$lib/server/auth/auth';
import { randomUUID } from 'node:crypto';
import { getAllVerticals, getUserAssignedVerticals, setUserAssignedVerticals } from '$lib/server/verticals';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'SUPER_ADMIN') {
		throw redirect(303, '/?error=unauthorized');
	}

	const allUsers = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			role: users.role,
			createdAt: users.createdAt,
			updatedAt: users.updatedAt
		})
		.from(users)
		.orderBy(desc(users.createdAt));

	const allVerticals = await getAllVerticals();

	const usersWithVerticals = await Promise.all(
		allUsers.map(async (u) => {
			const assigned = await getUserAssignedVerticals(u.id);
			return {
				...u,
				assignedVerticals: assigned
			};
		})
	);

	return {
		usersList: usersWithVerticals,
		verticalsList: allVerticals
	};
};

export const actions: Actions = {
	createUser: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'SUPER_ADMIN') {
			return fail(403, { error: 'Unauthorized. Super Admin permissions required.' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const password = formData.get('password')?.toString();
		const role = formData.get('role')?.toString() as 'SUPER_ADMIN' | 'ADMIN' | 'AGENT';
		const verticalIds = formData.getAll('verticalIds').map((v) => v.toString()).filter(Boolean);

		if (!name || !email || !password || !role) {
			return fail(400, { error: 'All fields (Name, Email, Password, Role) are required.' });
		}

		if (!['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(role)) {
			return fail(400, { error: 'Invalid user role selected.' });
		}

		// Check if email already exists
		const [existingUser] = await db.select().from(users).where(eq(users.email, email));
		if (existingUser) {
			return fail(400, { error: `User with email "${email}" already exists.` });
		}

		const now = new Date().toISOString();
		const userId = `user_${randomUUID().split('-')[0]}`;
		const passwordHash = hashPassword(password);

		await db.insert(users).values({
			id: userId,
			name,
			email,
			passwordHash,
			role,
			createdAt: now,
			updatedAt: now
		});

		// Save vertical assignments
		if (verticalIds.length > 0) {
			await setUserAssignedVerticals(userId, verticalIds);
		}

		return { success: true, message: `Successfully created user account for ${name} (${role})` };
	},

	updateUser: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'SUPER_ADMIN') {
			return fail(403, { error: 'Unauthorized. Super Admin permissions required.' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		const name = formData.get('name')?.toString().trim();
		const email = formData.get('email')?.toString().trim().toLowerCase();
		const newPassword = formData.get('newPassword')?.toString();
		const currentPassword = formData.get('currentPassword')?.toString();

		if (!userId || !name || !email) {
			return fail(400, { error: 'User ID, Full Name, and Email are required.' });
		}

		if (!currentPassword) {
			return fail(400, { error: 'Please enter your current/previous password to authorize account changes.' });
		}

		// Verify dev user's previous password
		const [devUserRecord] = await db.select().from(users).where(eq(users.id, locals.user.id));
		if (!devUserRecord || !verifyPassword(currentPassword, devUserRecord.passwordHash)) {
			return fail(400, { error: 'Authorization failed: Incorrect previous password entered. Please enter your active password.' });
		}

		// Check email uniqueness if email changed
		const [existingEmail] = await db
			.select()
			.from(users)
			.where(and(eq(users.email, email), ne(users.id, userId)));
		if (existingEmail) {
			return fail(400, { error: `Email "${email}" is already used by another user account.` });
		}

		const updatePayload: Record<string, any> = {
			name,
			email,
			updatedAt: new Date().toISOString()
		};

		if (newPassword && newPassword.trim().length > 0) {
			if (newPassword.trim().length < 6) {
				return fail(400, { error: 'New password must be at least 6 characters long.' });
			}
			updatePayload.passwordHash = hashPassword(newPassword.trim());
		}

		await db.update(users).set(updatePayload).where(eq(users.id, userId));

		if (formData.has('hasVerticalsField')) {
			const verticalIds = formData.getAll('verticalIds').map((v) => v.toString()).filter(Boolean);
			await setUserAssignedVerticals(userId, verticalIds);
		}

		return { success: true, message: `Account details for ${name} updated successfully.` };
	},

	assignVerticals: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'SUPER_ADMIN') {
			return fail(403, { error: 'Unauthorized. Super Admin permissions required.' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		const verticalIds = formData.getAll('verticalIds').map((v) => v.toString()).filter(Boolean);

		if (!userId) {
			return fail(400, { error: 'User ID is required.' });
		}

		const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
		if (targetUser && ['SUPER_ADMIN', 'ADMIN'].includes(targetUser.role)) {
			return fail(400, { error: 'Assigning verticals is not applicable for administrators. Admins have access to all verticals.' });
		}

		await setUserAssignedVerticals(userId, verticalIds);

		return { success: true, message: 'User vertical assignments updated successfully.' };
	},

	updateRole: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'SUPER_ADMIN') {
			return fail(403, { error: 'Unauthorized. Super Admin permissions required.' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		const newRole = formData.get('newRole')?.toString() as 'SUPER_ADMIN' | 'ADMIN' | 'AGENT';

		if (!userId || !newRole) {
			return fail(400, { error: 'User ID and target role are required.' });
		}

		await db
			.update(users)
			.set({
				role: newRole,
				updatedAt: new Date().toISOString()
			})
			.where(eq(users.id, userId));

		return { success: true, message: 'User role updated successfully.' };
	},

	resetPassword: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'SUPER_ADMIN') {
			return fail(403, { error: 'Unauthorized. Super Admin permissions required.' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		const newPassword = formData.get('newPassword')?.toString();
		const currentPassword = formData.get('currentPassword')?.toString();

		if (!userId || !newPassword || newPassword.length < 6) {
			return fail(400, { error: 'New password must be at least 6 characters long.' });
		}

		if (!currentPassword) {
			return fail(400, { error: 'Please enter your current/previous password to authorize password reset.' });
		}

		// Verify dev user's previous password
		const [devUserRecord] = await db.select().from(users).where(eq(users.id, locals.user.id));
		if (!devUserRecord || !verifyPassword(currentPassword, devUserRecord.passwordHash)) {
			return fail(400, { error: 'Authorization failed: Incorrect previous password entered.' });
		}

		const newHash = hashPassword(newPassword);
		await db
			.update(users)
			.set({
				passwordHash: newHash,
				updatedAt: new Date().toISOString()
			})
			.where(eq(users.id, userId));

		return { success: true, message: 'User password reset successfully.' };
	},

	deleteUser: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'SUPER_ADMIN') {
			return fail(403, { error: 'Unauthorized. Super Admin permissions required.' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();

		if (!userId) {
			return fail(400, { error: 'User ID required.' });
		}

		if (userId === locals.user.id) {
			return fail(400, { error: 'You cannot delete your own active Super Admin account.' });
		}

		await db.delete(users).where(eq(users.id, userId));

		return { success: true, message: 'User account removed.' };
	}
};
