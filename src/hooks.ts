import type { Reroute } from '@sveltejs/kit';

export const reroute: Reroute = ({ url }) => {
	const host = url.hostname;
	const isPageDomain =
		host.startsWith('page.') ||
		host.includes('page.nbmsinc.com');

	if (isPageDomain) {
		const pathname = url.pathname;

		// Do not reroute system assets, API endpoints, or favicons
		if (
			pathname.startsWith('/_app') ||
			pathname.startsWith('/api') ||
			pathname.startsWith('/favicon') ||
			pathname.startsWith('/build') ||
			pathname.includes('.')
		) {
			return;
		}

		// Root page.nbmsinc.com/ -> /funnel/mmj-dispensary (default vertical)
		if (pathname === '/' || pathname === '') {
			return '/funnel/mmj-dispensary';
		}

		// Keep direct /funnel/[slug] requests as-is
		if (pathname.startsWith('/funnel/')) {
			return pathname;
		}

		// Map page.nbmsinc.com/[slug] -> /funnel/[slug]
		const slug = pathname.replace(/^\//, '');
		if (slug) {
			return `/funnel/${slug}`;
		}
	}
};
