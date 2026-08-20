/**
 * Canonical Component
 *
 * Maintains the <link rel="canonical"> tag as the route changes.
 * Must be placed inside BrowserRouter.
 *
 * Only public marketing pages get a canonical URL. Application routes are
 * disallowed in robots.txt, so tagging them would be noise; the tag is
 * removed on those routes instead of pointing somewhere misleading.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_ORIGIN = 'https://www.qwohter.com';

/**
 * Public paths that should be indexed, mapped to their canonical path.
 * Routes rendering the same page under two URLs collapse onto one entry.
 */
const CANONICAL_PATHS: Record<string, string> = {
  '/': '/',
  '/demo': '/demo',
  '/contact-us': '/contact-us',
  '/faq': '/faq',
  '/legal': '/legal',
  '/privacy-policy': '/privacy-policy',
  // Renders the same PrivacyPolicy page as /privacy-policy
  '/privacy-notice': '/privacy-policy',
  '/terms-of-service': '/terms-of-service',
  '/cookie-settings': '/cookie-settings',
  '/accessibility-statement': '/accessibility-statement',
  '/do-not-sell-my-personal-information': '/do-not-sell-my-personal-information',
};

/** Strips the trailing slash so "/faq/" and "/faq" resolve to one entry. */
function normalize(pathname: string): string {
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '');
}

export function Canonical() {
  const { pathname } = useLocation();

  useEffect(() => {
    const canonicalPath = CANONICAL_PATHS[normalize(pathname)];
    const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!canonicalPath) {
      existing?.remove();
      return;
    }

    const link = existing ?? document.createElement('link');
    link.rel = 'canonical';
    link.href = `${SITE_ORIGIN}${canonicalPath === '/' ? '/' : canonicalPath}`;
    if (!existing) document.head.appendChild(link);
  }, [pathname]);

  return null;
}
