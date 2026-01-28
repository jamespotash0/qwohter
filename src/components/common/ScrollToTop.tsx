/**
 * ScrollToTop Component
 *
 * Scrolls to top of page on route change.
 * Must be placed inside BrowserRouter.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
