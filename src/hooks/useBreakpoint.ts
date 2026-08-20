import * as React from 'react';

/**
 * Breakpoints mirror the Tailwind config so JS-side decisions and CSS-side
 * utilities can never drift apart.
 */
export const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;
export type DeviceTier = 'mobile' | 'tablet' | 'desktop';

/**
 * Returns the current device tier plus convenience booleans.
 *
 * `useIsMobile` is a binary check at 768px, which cannot express "tablet" —
 * so layouts that need three states (stacked / condensed / full) use this.
 * Reads synchronously on first render to avoid a layout flash.
 */
export function useBreakpoint() {
  const getTier = React.useCallback((): DeviceTier => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < BREAKPOINTS.md) return 'mobile';
    if (w < BREAKPOINTS.xl) return 'tablet';
    return 'desktop';
  }, []);

  const [tier, setTier] = React.useState<DeviceTier>(getTier);

  React.useEffect(() => {
    const onResize = () => setTier(getTier());
    // Re-sync on mount in case the first paint happened at a different size.
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [getTier]);

  return {
    tier,
    isMobile: tier === 'mobile',
    isTablet: tier === 'tablet',
    isDesktop: tier === 'desktop',
    /** True for anything narrower than a full desktop layout. */
    isCompact: tier !== 'desktop',
  };
}

export default useBreakpoint;
