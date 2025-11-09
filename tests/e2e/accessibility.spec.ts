import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { STORAGE_KEY } from '../../src/lib/storage';

test.describe('Accessibility - Home Screen', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          boxes: [
            {
              id: 'box-1',
              flavorId: 'flavor-1',
              quantity: 5,
              location: { stack: 1, height: 1 },
              isOpen: true,
            },
          ],
          flavors: [{ id: 'flavor-1', name: 'Chocolate', excludeFromRandom: false }],
          favoriteFlavorId: 'flavor-1',
          settings: {},
        })
      );
    }, STORAGE_KEY);
    await page.goto('/#/');

    // Dismiss WelcomeModal if it appears
    try {
      const startFreshButton = page.getByRole('button', { name: /start fresh/i });
      await startFreshButton.waitFor({ state: 'visible', timeout: 2000 });
      await startFreshButton.click();
      await page.waitForTimeout(500); // Wait for modal close animation
    } catch {
      // Modal didn't appear (localStorage already prevents it), continue with test
    }
  });

  test('should not have automatically detectable accessibility issues', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper page title', async ({ page }) => {
    await expect(page).toHaveTitle(/BroteinBuddy/);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('should have keyboard accessible buttons', async ({ page }) => {
    const randomButton = page.getByRole('button', { name: /random/i });
    await randomButton.focus();
    await expect(randomButton).toBeFocused();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );
    expect(contrastViolations).toEqual([]);
  });
});

test.describe('Accessibility - Random Selection Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          boxes: [
            {
              id: 'box-1',
              flavorId: 'flavor-1',
              quantity: 5,
              location: { stack: 1, height: 1 },
              isOpen: true,
            },
          ],
          flavors: [{ id: 'flavor-1', name: 'Chocolate', excludeFromRandom: false }],
          favoriteFlavorId: null,
          settings: {},
        })
      );
    }, STORAGE_KEY);
    await page.goto('/#/');

    // Dismiss WelcomeModal if it appears
    try {
      const startFreshButton = page.getByRole('button', { name: /start fresh/i });
      await startFreshButton.waitFor({ state: 'visible', timeout: 2000 });
      await startFreshButton.click();
      await page.waitForTimeout(500); // Wait for modal close animation
    } catch {
      // Modal didn't appear (localStorage already prevents it), continue with test
    }
  });

  test('should not have accessibility issues on random page', async ({ page }) => {
    await page.getByRole('button', { name: /random/i }).click();
    await page.waitForURL('/#/random');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility issues on confirm page', async ({ page }) => {
    await page.getByRole('button', { name: /random/i }).click();
    // Wait for random selection page first
    await page.waitForURL('/#/random');

    // Wait for either success (confirm page) or error message
    // This handles both paths and will fail with a clear message if neither happens
    const result = await Promise.race([
      page.waitForURL('/#/random/confirm', { timeout: 30000 }).then(() => 'success'),
      page
        .locator('.error-message')
        .waitFor({ timeout: 30000 })
        .then(() => 'error'),
    ]);

    // If we got an error, fail the test with the error message
    if (result === 'error') {
      const errorText = await page.locator('.error-message').textContent();
      throw new Error(`Random selection failed: ${errorText}`);
    }

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA labels for loading states', async ({ page }) => {
    await page.getByRole('button', { name: /random/i }).click();
    await page.waitForURL('/#/random');

    // Check for aria-live region or aria-label on spinner
    const spinner = page.locator('[role="status"], [aria-live]').first();
    await expect(spinner).toBeVisible();
  });
});

test.describe('Accessibility - Inventory Screen', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          boxes: [
            {
              id: 'box-1',
              flavorId: 'flavor-1',
              quantity: 5,
              location: { stack: 1, height: 1 },
              isOpen: true,
            },
            {
              id: 'box-2',
              flavorId: 'flavor-2',
              quantity: 3,
              location: { stack: 2, height: 1 },
              isOpen: false,
            },
          ],
          flavors: [
            { id: 'flavor-1', name: 'Chocolate', excludeFromRandom: false },
            { id: 'flavor-2', name: 'Vanilla', excludeFromRandom: false },
          ],
          favoriteFlavorId: null,
          settings: {},
        })
      );
    }, STORAGE_KEY);
    await page.goto('/#/inventory');

    // Dismiss WelcomeModal if it appears
    try {
      const startFreshButton = page.getByRole('button', { name: /start fresh/i });
      await startFreshButton.waitFor({ state: 'visible', timeout: 2000 });
      await startFreshButton.click();
      await page.waitForTimeout(500); // Wait for modal close animation
    } catch {
      // Modal didn't appear (localStorage already prevents it), continue with test
    }
  });

  test('should not have accessibility issues on inventory visual view', async ({ page }) => {
    // Wait for and dismiss the Welcome Modal (appears for first-time users)
    try {
      const startFreshButton = page.getByRole('button', { name: /start fresh/i });
      await startFreshButton.waitFor({ state: 'visible', timeout: 2000 });
      await startFreshButton.click();
      await page.waitForTimeout(500); // Wait for modal close animation
    } catch {
      // Modal didn't appear (localStorage already set), continue with test
    }

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility issues on inventory table view', async ({ page }) => {
    // Click the view toggle button (starts as "View: Visual", toggles to table mode)
    await page.getByRole('button', { name: /view:/i }).click();
    await page.waitForTimeout(500); // Wait for view switch

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper labels for interactive elements', async ({ page }) => {
    const newFlavorButton = page.getByRole('button', { name: /new flavor/i });
    await expect(newFlavorButton).toBeVisible();

    const rearrangeButton = page.getByRole('button', { name: /rearrange/i });
    await expect(rearrangeButton).toBeVisible();
  });

  test('should support keyboard navigation to interactive elements', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Accessibility - Box Edit Screen', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          boxes: [
            {
              id: 'box-1',
              flavorId: 'flavor-1',
              quantity: 5,
              location: { stack: 1, height: 1 },
              isOpen: true,
            },
          ],
          flavors: [{ id: 'flavor-1', name: 'Chocolate', excludeFromRandom: false }],
          favoriteFlavorId: null,
          settings: {},
        })
      );
    }, STORAGE_KEY);
  });

  test('should not have accessibility issues on edit page', async ({ page }) => {
    await page.goto('/#/inventory/box-1/edit');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  // Skipped: Advanced form control accessibility - See issue #68
  // Feature requires enhanced ARIA patterns for quantity management buttons
  test.skip('should have accessible form controls', async ({ page }) => {
    await page.goto('/#/inventory/box-1/edit');

    // Check that buttons have accessible names
    const addButton = page.getByRole('button', { name: /add/i });
    await expect(addButton).toBeVisible();

    const removeButton = page.getByRole('button', { name: /remove/i });
    await expect(removeButton).toBeVisible();
  });
});

test.describe('Accessibility - Rearrange Screen', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          boxes: [
            {
              id: 'box-1',
              flavorId: 'flavor-1',
              quantity: 5,
              location: { stack: 1, height: 1 },
              isOpen: true,
            },
            {
              id: 'box-2',
              flavorId: 'flavor-2',
              quantity: 3,
              location: { stack: 2, height: 1 },
              isOpen: false,
            },
          ],
          flavors: [
            { id: 'flavor-1', name: 'Chocolate', excludeFromRandom: false },
            { id: 'flavor-2', name: 'Vanilla', excludeFromRandom: false },
          ],
          favoriteFlavorId: null,
          settings: {},
        })
      );
    }, STORAGE_KEY);
    await page.goto('/#/inventory/rearrange');

    // Dismiss WelcomeModal if it appears
    try {
      const startFreshButton = page.getByRole('button', { name: /start fresh/i });
      await startFreshButton.waitFor({ state: 'visible', timeout: 2000 });
      await startFreshButton.click();
      await page.waitForTimeout(500); // Wait for modal close animation
    } catch {
      // Modal didn't appear (localStorage already prevents it), continue with test
    }
  });

  test('should not have accessibility issues on rearrange page', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  // Skipped: Drag-and-drop accessibility - See issue #68
  // Feature requires keyboard-accessible alternative to drag-and-drop rearrangement
  test.skip('should have accessible drag-and-drop controls', async ({ page }) => {
    const confirmButton = page.getByRole('button', { name: /confirm/i });
    await expect(confirmButton).toBeVisible();

    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await expect(cancelButton).toBeVisible();
  });
});

test.describe('Accessibility - Color Contrast Verification', () => {
  const routes = ['/', '/random/confirm', '/inventory', '/inventory/box-1/edit'];

  for (const route of routes) {
    test(`should have WCAG AA color contrast on ${route}`, async ({ page, context }) => {
      await context.addInitScript((key) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            boxes: [
              {
                id: 'box-1',
                flavorId: 'flavor-1',
                quantity: 5,
                location: { stack: 1, height: 1 },
                isOpen: true,
              },
            ],
            flavors: [{ id: 'flavor-1', name: 'Chocolate', excludeFromRandom: false }],
            favoriteFlavorId: null,
            settings: {},
          })
        );
      }, STORAGE_KEY);

      // Navigate to /random/confirm via random selection flow
      if (route === '/random/confirm') {
        await page.goto('/#/');

        // Dismiss WelcomeModal if it appears
        try {
          const startFreshButton = page.getByRole('button', { name: /start fresh/i });
          await startFreshButton.waitFor({ state: 'visible', timeout: 2000 });
          await startFreshButton.click();
          await page.waitForTimeout(500); // Wait for modal close animation
        } catch {
          // Modal didn't appear (localStorage already prevents it), continue with test
        }

        await page.getByRole('button', { name: /random/i }).click();
        // Wait for random page first, then confirm page (selection is async, needs time)
        await page.waitForURL('/#/random');

        // Wait for either success (confirm page) or error message
        const result = await Promise.race([
          page.waitForURL('/#/random/confirm', { timeout: 30000 }).then(() => 'success'),
          page
            .locator('.error-message')
            .waitFor({ timeout: 30000 })
            .then(() => 'error'),
        ]);

        // If we got an error, fail the test with the error message
        if (result === 'error') {
          const errorText = await page.locator('.error-message').textContent();
          throw new Error(`Random selection failed: ${errorText}`);
        }
      } else {
        await page.goto(`/#${route}`);

        // Dismiss WelcomeModal if it appears
        try {
          const startFreshButton = page.getByRole('button', { name: /start fresh/i });
          await startFreshButton.waitFor({ state: 'visible', timeout: 2000 });
          await startFreshButton.click();
          await page.waitForTimeout(500); // Wait for modal close animation
        } catch {
          // Modal didn't appear (localStorage already prevents it), continue with test
        }
      }

      await page.waitForTimeout(1000); // Wait for page to fully render

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include('body')
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        (v) => v.id === 'color-contrast'
      );

      expect(contrastViolations).toEqual([]);
    });
  }
});

test.describe('Accessibility - Keyboard Navigation', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          boxes: [
            {
              id: 'box-1',
              flavorId: 'flavor-1',
              quantity: 5,
              location: { stack: 1, height: 1 },
              isOpen: true,
            },
          ],
          flavors: [{ id: 'flavor-1', name: 'Chocolate', excludeFromRandom: false }],
          favoriteFlavorId: 'flavor-1',
          settings: {},
        })
      );
    }, STORAGE_KEY);
  });

  // Skipped: Complex keyboard navigation patterns - See issue #68
  // Feature requires comprehensive tab order management and focus state tracking
  test.skip('should support tab navigation through all interactive elements on home', async ({
    page,
  }) => {
    await page.goto('/#/');

    // Tab through all interactive elements
    await page.keyboard.press('Tab');
    let focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Continue tabbing and verify we can reach all buttons
    const buttonCount = await page.getByRole('button').count();
    for (let i = 0; i < buttonCount; i++) {
      await page.keyboard.press('Tab');
      focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should support Enter key on focused buttons', async ({ page }) => {
    await page.goto('/#/');

    // Focus first button directly (skip link focus varies by browser)
    const randomButton = page.locator('button').filter({ hasText: /Random Pick/i });
    await randomButton.focus();

    const initialUrl = page.url();

    // Press Enter on focused button
    await randomButton.press('Enter');

    // Should navigate to another page
    await page.waitForTimeout(500);
    const newUrl = page.url();
    expect(newUrl).not.toBe(initialUrl);
  });
});

test.describe('Accessibility - Modal Dialogs', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          boxes: [],
          flavors: [
            { id: 'flavor-1', name: 'Chocolate', excludeFromRandom: false },
            { id: 'flavor-2', name: 'Vanilla', excludeFromRandom: false },
          ],
          favoriteFlavorId: null,
          settings: {},
        })
      );
    }, STORAGE_KEY);
  });

  // Skipped: Advanced modal accessibility - See issue #68
  // Feature requires enhanced modal ARIA attributes beyond basic implementation
  test.skip('should have proper modal accessibility attributes', async ({ page }) => {
    await page.goto('/#/inventory');

    // Open new flavor modal
    await page.getByRole('button', { name: /new flavor/i }).click();
    await page.waitForTimeout(500);

    // Check for modal dialog attributes
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  // Skipped: Modal focus trapping - See issue #68
  // Feature requires focus trap implementation to prevent keyboard navigation outside modal
  test.skip('should trap focus within modal', async ({ page }) => {
    await page.goto('/#/inventory');

    // Open new flavor modal
    await page.getByRole('button', { name: /new flavor/i }).click();
    await page.waitForTimeout(500);

    // Tab through modal elements - focus should stay within modal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();

    // Verify focused element is within modal
    const isWithinModal = await focused.evaluate(
      (el, modalEl) => {
        return modalEl.contains(el);
      },
      await modal.elementHandle()
    );
    expect(isWithinModal).toBe(true);
  });

  // Skipped: Modal keyboard interactions - See issue #68
  // Feature requires Escape key handler for modal dismissal
  test.skip('should close modal on Escape key', async ({ page }) => {
    await page.goto('/#/inventory');

    // Open new flavor modal
    await page.getByRole('button', { name: /new flavor/i }).click();
    await page.waitForTimeout(500);

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Modal should be closed
    await expect(modal).not.toBeVisible();
  });
});
