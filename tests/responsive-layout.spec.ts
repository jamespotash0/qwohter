import { test, expect } from '@playwright/test';

/**
 * Responsive layout guard for the marketing site.
 *
 * The landing pages were originally pixel-designed for a single 1440px
 * viewport, and because the hero/footer wrappers use `overflow-hidden` the
 * breakage showed up as silently cropped content rather than a scrollbar.
 * These tests assert the two things that failure mode produces:
 *   1. the page never scrolls horizontally
 *   2. no visible element extends past the viewport edge
 *
 * Decorative layers (`pointer-events-none` blurs, the SVG-clipped feature
 * animation) are excluded — they are intentionally oversized and clipped.
 */

const ROUTES = ['/', '/demo', '/contact-us'];

const VIEWPORTS = [
  { name: 'mobile-sm', width: 375, height: 812 },
  { name: 'mobile-lg', width: 430, height: 932 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
];

/** Scroll the full page so lazy/animated sections mount before measuring. */
async function settle(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
}

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    test(`${route} has no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(route, { waitUntil: 'networkidle' });
      await settle(page);

      const hScroll = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(hScroll, `${route} scrolls horizontally at ${vp.width}px`).toBeLessThanOrEqual(1);

      const offenders = await page.evaluate((vw: number) => {
        const found: { tag: string; cls: string; text: string; over: number }[] = [];
        for (const el of Array.from(document.querySelectorAll('body *'))) {
          const cs = getComputedStyle(el);
          if (cs.pointerEvents === 'none' || cs.visibility === 'hidden') continue;
          // Skip anything inside a deliberate horizontal scroller (carousels)
          // or inside an SVG, which clips to its own viewBox.
          let p: Element | null = el.parentElement;
          let skip = false;
          while (p && p !== document.body) {
            const pc = getComputedStyle(p);
            if (pc.overflowX === 'auto' || pc.overflowX === 'scroll' || p.tagName === 'svg') {
              skip = true;
              break;
            }
            p = p.parentElement;
          }
          if (skip || el.closest('svg')) continue;

          const r = el.getBoundingClientRect();
          if (r.width < 30 || r.height < 8) continue;
          const over = Math.round(Math.max(r.right - vw, -r.left));
          if (over > 4) {
            found.push({
              tag: el.tagName.toLowerCase(),
              cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80),
              text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
              over,
            });
          }
        }
        return found.sort((a, b) => b.over - a.over).slice(0, 5);
      }, vp.width);

      expect(
        offenders,
        `elements extend past the ${vp.width}px viewport:\n${JSON.stringify(offenders, null, 2)}`
      ).toEqual([]);
    });
  }
}

test('mobile navigation is reachable on the landing page', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/', { waitUntil: 'networkidle' });

  // The desktop pill is hidden below md; the hamburger must take its place.
  const trigger = page.getByRole('button', { name: 'Open menu' });
  await expect(trigger).toBeVisible();

  await trigger.click();
  for (const label of ['Home', 'Features', 'Use Cases', 'Pricing', 'Contact Us']) {
    await expect(page.getByRole('link', { name: label })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

test('hero headline wraps instead of being clipped on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/', { waitUntil: 'networkidle' });

  const box = await page.locator('h1').first().boundingBox();
  expect(box).not.toBeNull();
  // Previously `whitespace-nowrap` forced a 987px single line inside a 375px view.
  expect(box!.width).toBeLessThanOrEqual(375);
});
