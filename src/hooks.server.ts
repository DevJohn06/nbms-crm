import { redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE_NAME, validateSession, deleteSessionCookie } from '$lib/server/auth/auth';

export const handle: Handle = async ({ event, resolve }) => {
	// Support x-forwarded-host header behind Vercel reverse proxy
	const host =
		event.request.headers.get('x-forwarded-host') ||
		event.request.headers.get('host') ||
		event.url.hostname ||
		'';

	const isPageDomain =
		host.startsWith('page.') ||
		host.includes('page.nbmsinc.com');

	const isDispensarySubdomain =
		host.startsWith('dispensary.') ||
		host.includes('dispensary.nbmsinc.com');

	const pathname = event.url.pathname;
	const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');

	// Domain Redirect: Redirect legacy /funnel or dispensary subdomain requests to https://page.nbmsinc.com/[slug]
	if (
		!isPageDomain &&
		!isLocalHost &&
		(pathname.startsWith('/funnel') || isDispensarySubdomain)
	) {
		const targetDomain = 'page.nbmsinc.com';
		let redirectPath = pathname.replace(/^\/funnel\/?/, '');
		if (redirectPath === 'mmj-dispensary') {
			redirectPath = '';
		}
		const redirectTarget = `https://${targetDomain}/${redirectPath}${event.url.search}`;
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

	// Define public unauthenticated routes (page domain, dispensary subdomain, intake funnels, public api, asset requests)
	const isPublicRoute =
		isPageDomain ||
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
