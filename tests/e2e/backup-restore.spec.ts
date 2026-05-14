/**
 * End-to-end tests for the Backup & Restore feature.
 *
 * Covers the full user-visible flow: opening the modal from the
 * Inventory header, downloading a backup file with the expected
 * filename pattern, picking a backup file, confirming the destructive
 * replace, and observing the new data on the page.
 *
 * @group e2e
 * @module tests/e2e/backup-restore
 */

import { test, expect } from '@playwright/test';
import type { AppState } from '../../src/types/models';
import { STORAGE_KEY } from '../../src/lib/storage';

const initialState: AppState = {
  version: 2,
  boxes: [
    {
      id: 'box_initial',
      flavorId: 'flavor_chocolate',
      quantity: 12,
      location: { stack: 1, height: 0 },
      isOpen: false,
    },
  ],
  flavors: [{ id: 'flavor_chocolate', name: 'Chocolate', randomPool: 'caffeine-free' }],
  favoriteFlavorId: null,
  settings: {},
};

const replacementState: AppState = {
  version: 2,
  boxes: [
    {
      id: 'box_replacement_1',
      flavorId: 'flavor_mocha',
      quantity: 8,
      location: { stack: 1, height: 0 },
      isOpen: true,
    },
    {
      id: 'box_replacement_2',
      flavorId: 'flavor_vanilla',
      quantity: 4,
      location: { stack: 2, height: 0 },
      isOpen: false,
    },
  ],
  flavors: [
    { id: 'flavor_mocha', name: 'Mocha Backup', randomPool: 'caffeinated' },
    { id: 'flavor_vanilla', name: 'Vanilla Backup', randomPool: 'caffeine-free' },
  ],
  favoriteFlavorId: 'flavor_mocha',
  settings: {},
};

test.describe('Backup & Restore', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(
      ({ key, state }) => {
        localStorage.setItem(key, JSON.stringify(state));
      },
      { key: STORAGE_KEY, state: initialState }
    );

    await page.goto('/#/inventory');

    // Dismiss WelcomeModal if it appears (defensive, mirrors inventory.spec)
    try {
      const startFreshButton = page.getByRole('button', { name: /start fresh/i });
      await startFreshButton.waitFor({ state: 'visible', timeout: 2000 });
      await startFreshButton.click();
      await page.waitForTimeout(300);
    } catch {
      // No modal — that's fine
    }

    await expect(page.locator('h1')).toContainText('Inventory');
  });

  test('opens the backup modal from the Inventory header', async ({ page }) => {
    await page.getByTestId('inventory-backup-button').click();

    await expect(page.getByRole('heading', { name: 'Backup & Restore' })).toBeVisible();
    await expect(page.getByTestId('backup-modal-export')).toBeVisible();
    await expect(page.getByTestId('backup-modal-choose-file')).toBeVisible();
  });

  test('downloads a JSON backup with today’s date in the filename', async ({ page }) => {
    await page.getByTestId('inventory-backup-button').click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('backup-modal-export').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^brotein-buddy-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const text = Buffer.concat(chunks).toString('utf-8');
    const parsed = JSON.parse(text) as AppState;

    expect(parsed.version).toBe(2);
    expect(parsed.boxes).toHaveLength(1);
    expect(parsed.flavors[0].name).toBe('Chocolate');
  });

  test('restores a backup file and replaces existing data', async ({ page }) => {
    await page.getByTestId('inventory-backup-button').click();

    await page.getByTestId('backup-modal-file-input').setInputFiles({
      name: 'sample-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(replacementState), 'utf-8'),
    });

    const preview = page.getByTestId('backup-modal-preview');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('sample-backup.json');
    await expect(preview).toContainText('2 flavors');
    await expect(preview).toContainText('2 boxes');
    await expect(preview).toContainText('1 favorite flavor');

    await page.getByTestId('backup-modal-restore-confirm').click();

    // Modal closes after confirm
    await expect(page.getByRole('heading', { name: 'Backup & Restore' })).toBeHidden();

    // Inventory now reflects the replacement state
    await expect(page.locator('h1')).toContainText('Inventory');
    await expect(page.locator('text=Mocha Backup').first()).toBeVisible();
    await expect(page.locator('text=Vanilla Backup').first()).toBeVisible();
    await expect(page.locator('text=Chocolate').first()).toBeHidden();
  });

  test('shows an inline error for a malformed file and does not replace data', async ({ page }) => {
    await page.getByTestId('inventory-backup-button').click();

    await page.getByTestId('backup-modal-file-input').setInputFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from('this is not json {', 'utf-8'),
    });

    const errorBanner = page.getByTestId('backup-modal-error');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText(/not valid JSON/i);

    // Confirm button never appears for a failed parse
    await expect(page.getByTestId('backup-modal-restore-confirm')).toBeHidden();

    // Recover via "Try another file"
    await page.getByTestId('backup-modal-error-retry').click();
    await expect(page.getByTestId('backup-modal-choose-file')).toBeVisible();
  });

  test('cancel preserves existing data', async ({ page }) => {
    await page.getByTestId('inventory-backup-button').click();

    await page.getByTestId('backup-modal-file-input').setInputFiles({
      name: 'sample-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(replacementState), 'utf-8'),
    });

    await expect(page.getByTestId('backup-modal-preview')).toBeVisible();
    await page.getByTestId('backup-modal-restore-cancel').click();

    // Back to idle, file picker visible again
    await expect(page.getByTestId('backup-modal-choose-file')).toBeVisible();

    // Close modal and verify original data is still there
    await page.getByTestId('backup-modal-close').click();
    await expect(page.locator('text=Chocolate').first()).toBeVisible();
    await expect(page.locator('text=Mocha Backup')).toHaveCount(0);
  });
});
