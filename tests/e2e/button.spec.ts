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

  test.describe('Interactive States - Hover (Desktop Only)', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'Hover only works on desktop');

    test('primary button hover state', async ({ page }) => {
      const primaryButton = page.locator('button').filter({ hasText: 'Primary' }).first();
      await primaryButton.hover();
      await expect(primaryButton).toHaveScreenshot('button-hover-primary.png');
    });

    test('secondary button hover state', async ({ page }) => {
      const secondaryButton = page.locator('button').filter({ hasText: 'Secondary' }).first();
      await secondaryButton.hover();
      await expect(secondaryButton).toHaveScreenshot('button-hover-secondary.png');
    });

    test('danger button hover state', async ({ page }) => {
      const dangerButton = page.locator('button').filter({ hasText: 'Danger' }).first();
      await dangerButton.hover();
      await expect(dangerButton).toHaveScreenshot('button-hover-danger.png');
    });

    test('ghost button hover state', async ({ page }) => {
      const ghostButton = page.locator('button').filter({ hasText: 'Ghost' }).first();
      await ghostButton.hover();
      await expect(ghostButton).toHaveScreenshot('button-hover-ghost.png');
    });
  });

  test.describe('Interactive States - Focus', () => {
    test('button focus state via keyboard navigation', async ({ page }) => {
      // Tab to the first button
      await page.keyboard.press('Tab');

      const focusedButton = page.locator('button:focus');
      await expect(focusedButton).toBeFocused();
      await expect(focusedButton).toHaveScreenshot('button-focus.png');
    });

    test('focus visible outline meets accessibility standards', async ({ page }) => {
      // Tab to the first button
      await page.keyboard.press('Tab');

      const focusedButton = page.locator('button:focus');

      // Verify focus-visible outline is present and visible
      const outlineColor = await focusedButton.evaluate((el) => {
        return window.getComputedStyle(el).getPropertyValue('outline-color');
      });

      const outlineWidth = await focusedButton.evaluate((el) => {
        return window.getComputedStyle(el).getPropertyValue('outline-width');
      });

      // Outline should be visible (not 'none' or '0px')
      expect(outlineWidth).not.toBe('0px');
      expect(outlineColor).not.toBe('');
    });
  });
});
