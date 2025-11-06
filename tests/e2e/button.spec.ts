import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests for Button Component
 *
 * These tests capture screenshots of button states to detect visual regressions.
 * Baseline snapshots are committed to git and compared against on each test run.
 *
 * Tests are organized by:
 * - Variants (primary, secondary, danger, ghost)
 * - Sizes (sm, base, lg)
 * - States (enabled, disabled, hover, focus)
 * - Layout (normal, full-width)
 *
 * Note: Hover tests only run on Desktop Chrome (mobile devices don't have hover state)
 */

test.describe('Button Component Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/component-demo');
    // Wait for page to fully render
    await page.waitForLoadState('networkidle');
  });

  test.describe('Variants', () => {
    test('primary button renders correctly', async ({ page }) => {
      const section = page.locator('text=Variants').locator('..');
      const variantsContainer = section.locator('.flex').first();
      await expect(variantsContainer).toHaveScreenshot('button-variants.png');
    });
  });

  test.describe('Sizes', () => {
    test('button sizes render correctly', async ({ page }) => {
      const section = page.locator('text=Sizes').locator('..');
      const sizesContainer = section.locator('.flex').first();
      await expect(sizesContainer).toHaveScreenshot('button-sizes.png');
    });
  });

  test.describe('States', () => {
    test('enabled and disabled states render correctly', async ({ page }) => {
      const section = page.locator('text=States').locator('..');
      const statesContainer = section.locator('.flex').first();
      await expect(statesContainer).toHaveScreenshot('button-states.png');
    });
  });

  test.describe('Layout', () => {
    test('full-width button renders correctly', async ({ page }) => {
      const section = page.locator('text=Full Width').locator('..');
      await expect(section).toHaveScreenshot('button-full-width.png');
    });
  });

  test.describe('WCAG Compliance', () => {
    test('base button meets 44px minimum touch target', async ({ page }) => {
      const baseButton = page.locator('button').filter({ hasText: 'Base' }).first();

      // Visual snapshot
      await expect(baseButton).toHaveScreenshot('button-wcag-44px.png');

      // Programmatic verification
      const bbox = await baseButton.boundingBox();
      expect(bbox?.height).toBeGreaterThanOrEqual(44);
    });
  });
});
