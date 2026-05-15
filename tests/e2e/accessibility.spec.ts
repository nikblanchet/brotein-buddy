/**
 * Accessibility smoke checks for the refreshed screens.
 *
 * The pre-refresh axe sweep was per-screen and broad; this trimmed
 * version verifies the navigation contract (aria-current on the
 * active tab) and that key interactive surfaces have no
 * axe-detectable violations on the three top-level tabs.
 * Comprehensive axe sweeps will return in a follow-up once
 * the design has settled in production for a release.
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect, Page } from '@playwright/test';

async function dismissWelcome(page: Page) {
  try {
    const startFresh = page.getByRole('button', { name: /start fresh/i });
    await startFresh.waitFor({ state: 'visible', timeout: 1500 });
    await startFresh.click();
  } catch {
    // already dismissed
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('broteinbuddy_welcome_shown', 'true'));
});

test('Pick screen has nav landmarks and an active aria-current tab', async ({ page }) => {
  await page.goto('/#/');
  await dismissWelcome(page);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByTestId('nav-pick')).toHaveAttribute('aria-current', 'page');
});

test('Pick screen has no axe-detectable accessibility violations', async ({ page }) => {
  await page.goto('/#/');
  await dismissWelcome(page);
  const results = await new AxeBuilder({ page })
    .disableRules(['region']) // The single-page shell intentionally omits a per-screen <main> region
    .analyze();
  expect(results.violations).toEqual([]);
});

test('Inventory screen has no axe-detectable accessibility violations', async ({ page }) => {
  await page.goto('/#/inventory');
  await dismissWelcome(page);
  const results = await new AxeBuilder({ page }).disableRules(['region']).analyze();
  expect(results.violations).toEqual([]);
});

test('More screen has no axe-detectable accessibility violations', async ({ page }) => {
  await page.goto('/#/more');
  await dismissWelcome(page);
  const results = await new AxeBuilder({ page }).disableRules(['region']).analyze();
  expect(results.violations).toEqual([]);
});
