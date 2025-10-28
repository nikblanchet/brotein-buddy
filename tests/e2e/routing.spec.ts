import { test, expect } from '@playwright/test';

/**
 * E2E tests for client-side routing
 *
 * Tests navigation between all routes, hash URL handling,
 * browser back/forward navigation, deep linking, and 404 handling.
 *
 * These tests run in a mobile viewport (iPhone 13 Pro) to match
 * the PWA's primary use case.
 */

test.describe('Routing - Basic Navigation', () => {
  test('home page loads at root path', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Home');
    await expect(page).toHaveURL(/#\/$/);
  });

  test('random selection route loads', async ({ page }) => {
    await page.goto('/#/random');
    await expect(page.locator('h1')).toContainText('Random Selection');
    await expect(page).toHaveURL(/#\/random$/);
  });

  test('random confirm route loads', async ({ page }) => {
    await page.goto('/#/random/confirm');
    await expect(page.locator('h1')).toContainText('Confirm Selection');
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
  test('navigates from random to home via button', async ({ page }) => {
    await page.goto('/#/random');
    await expect(page.locator('h1')).toContainText('Random Selection');

    await page.click('text=Back to Home');

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('h1')).toContainText('Home');
  });

  test('navigates from inventory to home via button', async ({ page }) => {
    await page.goto('/#/inventory');
    await expect(page.locator('h1')).toContainText('Inventory');

    await page.click('text=Back to Home');

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('h1')).toContainText('Home');
  });

  test('navigates from box edit to inventory via button', async ({ page }) => {
    await page.goto('/#/inventory/box-123/edit');
    await expect(page.locator('h1')).toContainText('Edit Box');

    await page.click('text=Back to Inventory');

    await expect(page).toHaveURL(/#\/inventory$/);
    await expect(page.locator('h1')).toContainText('Inventory');
  });

  test('navigates from rearrange to inventory via button', async ({ page }) => {
    await page.goto('/#/inventory/rearrange');
    await expect(page.locator('h1')).toContainText('Rearrange Boxes');

    await page.click('text=Back to Inventory');

    await expect(page).toHaveURL(/#\/inventory$/);
    await expect(page.locator('h1')).toContainText('Inventory');
  });
});

test.describe('Routing - Browser Navigation', () => {
  test('back button navigates to previous route', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Home');

    await page.goto('/#/random');
    await expect(page.locator('h1')).toContainText('Random Selection');

    await page.goBack();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('h1')).toContainText('Home');
  });

  test('forward button navigates after going back', async ({ page }) => {
    await page.goto('/');
    await page.goto('/#/random');
    await page.goBack();

    await expect(page).toHaveURL(/#\/$/);

    await page.goForward();
    await expect(page).toHaveURL(/#\/random$/);
    await expect(page.locator('h1')).toContainText('Random Selection');
  });

  test('back button works through multiple routes', async ({ page }) => {
    await page.goto('/');
    await page.goto('/#/inventory');
    await page.goto('/#/inventory/box-abc/edit');

    await expect(page.locator('h1')).toContainText('Edit Box');

    await page.goBack();
    await expect(page).toHaveURL(/#\/inventory$/);
    await expect(page.locator('h1')).toContainText('Inventory');

    await page.goBack();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('h1')).toContainText('Home');
  });
});

test.describe('Routing - Deep Linking', () => {
  test('directly accessing root without hash redirects correctly', async ({ page }) => {
    await page.goto('/');
    // svelte-spa-router may add hash automatically
    await expect(page.locator('h1')).toContainText('Home');
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
    await expect(page.locator('h1')).toContainText('Home');
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
      { path: '/#/', expectedHeading: 'Home' },
      { path: '/#/random', expectedHeading: 'Random Selection' },
      { path: '/#/inventory', expectedHeading: 'Inventory' },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page).toHaveURL(new RegExp(`#${route.path.split('#')[1]}`));
      await expect(page.locator('h1')).toContainText(route.expectedHeading);
    }
  });

  test('hash format preserved through navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/#\//);

    await page.goto('/#/inventory');
    await expect(page).toHaveURL(/#\/inventory/);

    await page.goBack();
    await expect(page).toHaveURL(/#\//);
  });
});

test.describe('Routing - Placeholder Content', () => {
  test('all placeholder screens show coming soon status', async ({ page }) => {
    const routes = [
      '/#/random',
      '/#/inventory',
      '/#/inventory/box-1/edit',
      '/#/inventory/rearrange',
    ];

    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('.status')).toContainText('Coming soon');
    }
  });

  test('placeholder screens use consistent styling', async ({ page }) => {
    await page.goto('/#/random');

    const screen = page.locator('.placeholder-screen');
    await expect(screen).toBeVisible();

    // Check that design system is being used
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    await expect(title).toHaveCSS('margin', '0px');
  });
});
