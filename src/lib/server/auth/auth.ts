import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from '$lib/server/db';
import { users, sessions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';

export const SESSION_COOKIE_NAME = 'nbms_session';
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const derivedKey = scryptSync(password, salt, 64);
	return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, hash: string): boolean {
	try {
		const [salt, key] = hash.split(':');
		if (!salt || !key) return false;
		const keyBuffer = Buffer.from(key, 'hex');
		const derivedKey = scryptSync(password, salt, 64);
		return timingSafeEqual(keyBuffer, derivedKey);
	} catch {
		return false;
	}
}

export async function createSession(userId: string): Promise<string> {
	const token = randomBytes(32).toString('hex');
	const expiresAt = Date.now() + SESSION_DURATION_MS;
	await db.insert(sessions).values({
		id: token,
		userId,
		expiresAt
	});
	return token;
}

export async function validateSession(token: string) {
	try {
		const [sessionRecord] = await db.select().from(sessions).where(eq(sessions.id, token));
		if (!sessionRecord) return null;

		if (Date.now() > sessionRecord.expiresAt) {
			await db.delete(sessions).where(eq(sessions.id, token));
			return null;
		}

		const [userRecord] = await db.select().from(users).where(eq(users.id, sessionRecord.userId));
		if (!userRecord) {
			await db.delete(sessions).where(eq(sessions.id, token));
			return null;
		}

		return {
			session: sessionRecord,
			user: {
				id: userRecord.id,
				email: userRecord.email,
				name: userRecord.name,
				role: userRecord.role as 'SUPER_ADMIN' | 'ADMIN' | 'AGENT'
			}
		};
	} catch (error) {
		console.error('Error validating session:', error);
		return null;
	}
}

export async function invalidateSession(token: string): Promise<void> {
	try {
		await db.delete(sessions).where(eq(sessions.id, token));
	} catch (error) {
		console.error('Error invalidating session:', error);
	}
}

export function setSessionCookie(cookies: Cookies, token: string): void {
	cookies.set(SESSION_COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});
}

export function deleteSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}
