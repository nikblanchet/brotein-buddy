import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility - Home Screen', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'broteinbuddy-state',
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
    });
    await page.goto('/');
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
    await context.addInitScript(() => {
      localStorage.setItem(
        'broteinbuddy-state',
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
    });
    await page.goto('/');
  });

  test('should not have accessibility issues on random page', async ({ page }) => {
    await page.getByRole('button', { name: /random/i }).click();
    await page.waitForURL('/random');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility issues on confirm page', async ({ page }) => {
    await page.getByRole('button', { name: /random/i }).click();
    await page.waitForURL('/random/confirm');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper ARIA labels for loading states', async ({ page }) => {
    await page.getByRole('button', { name: /random/i }).click();
    await page.waitForURL('/random');

    // Check for aria-live region or aria-label on spinner
    const spinner = page.locator('[role="status"], [aria-live]').first();
    await expect(spinner).toBeVisible();
  });
});

test.describe('Accessibility - Inventory Screen', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'broteinbuddy-state',
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
    });
    await page.goto('/inventory');
  });

  test('should not have accessibility issues on inventory visual view', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have accessibility issues on inventory table view', async ({ page }) => {
    await page.getByRole('button', { name: /table/i }).click();
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
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'broteinbuddy-state',
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
    });
  });

  test('should not have accessibility issues on edit page', async ({ page }) => {
    await page.goto('/inventory/box-1/edit');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have accessible form controls', async ({ page }) => {
    await page.goto('/inventory/box-1/edit');

    // Check that buttons have accessible names
    const addButton = page.getByRole('button', { name: /add/i });
    await expect(addButton).toBeVisible();

    const removeButton = page.getByRole('button', { name: /remove/i });
    await expect(removeButton).toBeVisible();
  });
});

test.describe('Accessibility - Rearrange Screen', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'broteinbuddy-state',
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
    });
    await page.goto('/inventory/rearrange');
  });

  test('should not have accessibility issues on rearrange page', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have accessible drag-and-drop controls', async ({ page }) => {
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
      await context.addInitScript(() => {
        localStorage.setItem(
          'broteinbuddy-state',
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
      });

      // Skip /random and go directly to /random/confirm for testing
      if (route === '/random/confirm') {
        await page.goto('/');
        await page.getByRole('button', { name: /random/i }).click();
        await page.waitForURL('/random/confirm');
      } else {
        await page.goto(route);
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
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'broteinbuddy-state',
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
    });
  });

  test('should support tab navigation through all interactive elements on home', async ({
    page,
  }) => {
    await page.goto('/');

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
    await page.goto('/');

    // Tab to first button and press Enter
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await focused.press('Enter');

    // Should navigate to another page
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).not.toBe(await page.evaluate(() => window.location.href));
  });
});

test.describe('Accessibility - Modal Dialogs', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(() => {
      localStorage.setItem(
        'broteinbuddy-state',
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
    });
  });

  test('should have proper modal accessibility attributes', async ({ page }) => {
    await page.goto('/inventory');

    // Open new flavor modal
    await page.getByRole('button', { name: /new flavor/i }).click();
    await page.waitForTimeout(500);

    // Check for modal dialog attributes
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  test('should trap focus within modal', async ({ page }) => {
    await page.goto('/inventory');

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

  test('should close modal on Escape key', async ({ page }) => {
    await page.goto('/inventory');

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
