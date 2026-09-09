import { redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME, validateSession, deleteSessionCookie } from '$lib/server/auth/auth';

export const handle: Handle = async ({ event, resolve }) => {
	// Support x-forwarded-host header behind Vercel reverse proxy
	const host =
		event.request.headers.get('x-forwarded-host') ||
		event.request.headers.get('host') ||
		event.url.hostname ||
		'';

	const isDispensarySubdomain =
		host.startsWith('dispensary.') || host.includes('dispensary.payjeezy.com');

	// Domain Redirect: If accessing /funnel from crm.payjeezy.com or main domain, redirect to https://dispensary.payjeezy.com/funnel
	if (
		!isDispensarySubdomain &&
		event.url.pathname.startsWith('/funnel') &&
		!host.includes('localhost') &&
		!host.includes('127.0.0.1')
	) {
		const subpath = event.url.pathname.replace(/^\/funnel/, '');
		const redirectTarget = `https://dispensary.payjeezy.com${subpath || '/funnel'}`;
		throw redirect(307, redirectTarget);
	}

	const sessionToken = event.cookies.get(SESSION_COOKIE_NAME);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
	} else {
		const authResult = await validateSession(sessionToken);
		if (authResult) {
			event.locals.user = authResult.user;
			event.locals.session = authResult.session;
		} else {
			event.locals.user = null;
			event.locals.session = null;
			deleteSessionCookie(event.cookies);
		}
	}

	const pathname = event.url.pathname;

	// Define public unauthenticated routes (dispensary subdomain, intake funnels, public api, asset requests)
	const isPublicRoute =
		isDispensarySubdomain ||
		pathname.startsWith('/login') ||
		pathname.startsWith('/funnel') ||
		pathname.startsWith('/api/public') ||
		pathname.startsWith('/_app') ||
		pathname.startsWith('/favicon');

	// If unauthenticated user accesses a protected route -> redirect to /login
	if (!event.locals.user && !isPublicRoute) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(pathname)}`);
	}

	// If authenticated user visits /login -> redirect to home dashboard /
	if (event.locals.user && pathname === '/login') {
		throw redirect(303, '/');
	}

	// Developer / Super Admin restricted routes
	const isSuperAdminRoute = pathname.startsWith('/users') || pathname.startsWith('/admin');
	if (event.locals.user && isSuperAdminRoute && event.locals.user.role !== 'SUPER_ADMIN') {
		throw redirect(303, '/?error=unauthorized');
	}

	return resolve(event);
};
