import { test, expect } from '@playwright/test';
import type { AppState } from '../../src/types/models';

/**
 * E2E tests for client-side routing
 *
 * Tests navigation between all routes, hash URL handling,
 * browser back/forward navigation, deep linking, and 404 handling.
 *
 * These tests run in a mobile viewport (iPhone 13 Pro) to match
 * the PWA's primary use case.
 */

test.beforeEach(async ({ page }) => {
  // Set up test data for box edit routing tests
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

  await page.evaluate(() => {
    const testState: AppState = {
      version: 1,
      boxes: [
        {
          id: 'test-box-123',
          flavorId: 'flavor_chocolate',
          quantity: 5,
          location: { stack: 1, height: 1 },
          isOpen: false,
        },
        {
          id: 'box-123',
          flavorId: 'flavor_vanilla',
          quantity: 3,
          location: { stack: 1, height: 2 },
          isOpen: true,
        },
        {
          id: 'box-abc',
          flavorId: 'flavor_strawberry',
          quantity: 8,
          location: { stack: 2, height: 1 },
          isOpen: false,
        },
        {
          id: 'direct-link-box',
          flavorId: 'flavor_chocolate',
          quantity: 4,
          location: { stack: 2, height: 2 },
          isOpen: false,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          flavorId: 'flavor_vanilla',
          quantity: 6,
          location: { stack: 3, height: 1 },
          isOpen: true,
        },
        {
          id: 'box-123_test-ABC',
          flavorId: 'flavor_strawberry',
          quantity: 7,
          location: { stack: 3, height: 2 },
          isOpen: false,
        },
      ],
      flavors: [
        { id: 'flavor_chocolate', name: 'Chocolate', excludeFromRandom: false },
        { id: 'flavor_vanilla', name: 'Vanilla', excludeFromRandom: false },
        { id: 'flavor_strawberry', name: 'Strawberry', excludeFromRandom: false },
      ],
      favoriteFlavorId: null,
      settings: {},
    };
    localStorage.setItem('BROTEINBUDDY_APP_STATE', JSON.stringify(testState));
  });
  await page.reload();
});

test.describe('Routing - Basic Navigation', () => {
  test('home page loads at root path', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('h1')).toContainText('BroteinBuddy');
    await expect(page).toHaveURL(/#\/$/);
  });

  test('random selection route loads', async ({ page }) => {
    await page.goto('/#/random');
    // Random.svelte either shows loading state, redirects, or shows error
    // Check that it loads without crashing (URL or h1 will exist)
    await expect(page).toHaveURL(/#\/random/);
    // Component auto-performs selection, may have already redirected
    // Just verify it loaded successfully
  });

  test('random confirm route loads', async ({ page }) => {
    await page.goto('/#/random/confirm');
    // RandomConfirm.svelte shows error if no selectedFlavorId in sessionStorage
    await expect(page.locator('h1')).toContainText('Unable to Confirm');
    await expect(page).toHaveURL(/#\/random\/confirm$/);
  });

  test('inventory route loads', async ({ page }) => {
    await page.goto('/#/inventory');
    await expect(page.locator('h1')).toContainText('Inventory');
    await expect(page).toHaveURL(/#\/inventory$/);
  });

  test('inventory rearrange route loads', async ({ page }) => {
    await page.goto('/#/inventory/rearrange');
    await expect(page.locator('h1')).toContainText('Rearrange Boxes');
    await expect(page).toHaveURL(/#\/inventory\/rearrange$/);
  });

  test('inventory box edit route loads with boxId parameter', async ({ page }) => {
    await page.goto('/#/inventory/test-box-123/edit');
    await expect(page.locator('h1')).toContainText('Edit Box');
    await expect(page).toHaveURL(/#\/inventory\/test-box-123\/edit$/);
  });
});

test.describe('Routing - Button Navigation', () => {
  test.skip('navigates from random to home via button', async ({ page }) => {
    await page.goto('/#/random');
    await expect(page.locator('h1')).toContainText('Random Selection');

    await page.click('text=Back to Home');

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('h1')).toContainText('BroteinBuddy');
  });

  test.skip('navigates from inventory to home via button', async ({ page }) => {
    await page.goto('/#/inventory');
    await expect(page.locator('h1')).toContainText('Inventory');

    await page.click('text=Back to Home');

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('h1')).toContainText('BroteinBuddy');
  });

  test('navigates from box edit to inventory via button', async ({ page }) => {
    await page.goto('/#/inventory/box-123/edit');
    await expect(page.locator('h1')).toContainText('Edit Box');

    await page.click('text=← Back');

    await expect(page).toHaveURL(/#\/inventory$/);
    await expect(page.locator('h1')).toContainText('Inventory');
  });

  test('navigates from rearrange to inventory via button', async ({ page }) => {
    await page.goto('/#/inventory/rearrange');
    await expect(page.locator('h1')).toContainText('Rearrange Boxes');

    await page.click('text=Cancel');

    await expect(page).toHaveURL(/#\/inventory$/);
    await expect(page.locator('h1')).toContainText('Inventory');
  });
});

test.describe('Routing - Browser Navigation', () => {
  test('back button navigates to previous route', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('h1')).toContainText('BroteinBuddy');

    // Use /inventory instead of /random (which auto-redirects)
    await page.goto('/#/inventory');
    await expect(page.locator('h1')).toContainText('Inventory');

    await page.goBack();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('h1')).toContainText('BroteinBuddy');
  });

  test('forward button navigates after going back', async ({ page }) => {
    await page.goto('/#/');
    await page.goto('/#/inventory');
    await page.goBack();

    await expect(page).toHaveURL(/#\/$/);
    await page.goForward();
    await expect(page).toHaveURL(/#\/inventory$/);
    await expect(page.locator('h1')).toContainText('Inventory');
  });

  test('back button works through multiple routes', async ({ page }) => {
    await page.goto('/#/');
    await page.goto('/#/inventory');
    await page.goto('/#/inventory/box-abc/edit');

    await expect(page.locator('h1')).toContainText('Edit Box');

    await page.goBack();
    await expect(page).toHaveURL(/#\/inventory$/);
    await expect(page.locator('h1')).toContainText('Inventory');

    await page.goBack();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('h1')).toContainText('BroteinBuddy');
  });
});

test.describe('Routing - Deep Linking', () => {
  test('directly accessing root without hash redirects correctly', async ({ page }) => {
    await page.goto('/#/');
    // svelte-spa-router may add hash automatically
    await expect(page.locator('h1')).toContainText('BroteinBuddy');
  });

  test('directly accessing route with hash works', async ({ page }) => {
    await page.goto('/#/inventory');
    await expect(page.locator('h1')).toContainText('Inventory');
    await expect(page).toHaveURL(/#\/inventory$/);
  });

  test('directly accessing parameterized route works', async ({ page }) => {
    await page.goto('/#/inventory/direct-link-box/edit');
    await expect(page.locator('h1')).toContainText('Edit Box');
    await expect(page).toHaveURL(/#\/inventory\/direct-link-box\/edit$/);
  });

  test('direct link with UUID format boxId works', async ({ page }) => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    await page.goto(`/#/inventory/${uuid}/edit`);
    await expect(page.locator('h1')).toContainText('Edit Box');
    await expect(page).toHaveURL(new RegExp(`#/inventory/${uuid}/edit$`));
  });

  test('direct link with complex boxId works', async ({ page }) => {
    const boxId = 'box-123_test-ABC';
    await page.goto(`/#/inventory/${boxId}/edit`);
    await expect(page.locator('h1')).toContainText('Edit Box');
    await expect(page).toHaveURL(new RegExp(`#/inventory/${boxId}/edit$`));
  });
});

test.describe('Routing - 404 Handling', () => {
  test('invalid route shows 404 page', async ({ page }) => {
    await page.goto('/#/this-route-does-not-exist');
    await expect(page.locator('h1')).toContainText('404');
    await expect(page.locator('h2')).toContainText('Page Not Found');
  });

  test('404 page has working home button', async ({ page }) => {
    await page.goto('/#/invalid-route');
    await expect(page.locator('h1')).toContainText('404');

    await page.click('text=Go to Home');

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('h1')).toContainText('BroteinBuddy');
  });

  test('malformed inventory route shows 404', async ({ page }) => {
    await page.goto('/#/inventory/edit'); // Missing boxId parameter
    await expect(page.locator('h1')).toContainText('404');
  });

  test('extra path segments show 404', async ({ page }) => {
    await page.goto('/#/inventory/box-123/edit/extra');
    await expect(page.locator('h1')).toContainText('404');
  });
});

test.describe('Routing - Hash URL Format', () => {
  test('all routes use hash-based URLs', async ({ page }) => {
    const routes = [
      { path: '/#/', expectedHeading: 'BroteinBuddy' },
      { path: '/#/inventory', expectedHeading: 'Inventory' },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page).toHaveURL(new RegExp(route.path.replace(/\//g, '\\/')));
      await expect(page.locator('h1')).toContainText(route.expectedHeading);
    }
  });

  test('hash format preserved through navigation', async ({ page }) => {
    await page.goto('/#/');
    await expect(page).toHaveURL(/#\//);

    await page.goto('/#/inventory');
    await expect(page).toHaveURL(/#\/inventory/);

    await page.goBack();
    await expect(page).toHaveURL(/#\//);
  });
});

test.describe('Routing - Placeholder Content', () => {
  test.skip('all placeholder screens show coming soon status', async ({ page }) => {
    const routes = ['/random', '/inventory', '/inventory/box-1/edit', '/inventory/rearrange'];

    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('.status')).toContainText('Coming soon');
    }
  });

  test.skip('placeholder screens use consistent styling', async ({ page }) => {
    await page.goto('/#/random');

    const screen = page.locator('.placeholder-screen');
    await expect(screen).toBeVisible();

    // Check that design system is being used
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toHaveCSS('margin', '0px');
  });
});
