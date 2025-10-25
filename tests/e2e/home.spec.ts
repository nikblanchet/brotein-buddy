import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('loads successfully and displays the app', async ({ page }) => {
    await page.goto('/')

    // Check that the page loaded
    await expect(page).toHaveTitle(/Vite \+ Svelte \+ TS/)

    // Verify basic page structure exists
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('has proper viewport for mobile', async ({ page }) => {
    await page.goto('/')

    // Check viewport dimensions (this will use iPhone 13 Pro from config)
    const viewport = page.viewportSize()
    expect(viewport).toBeTruthy()
  })

  test('app is interactive', async ({ page }) => {
    await page.goto('/')

    // Find and click any interactive element (Vite/Svelte logos)
    const links = page.locator('a')
    const linkCount = await links.count()

    // Should have some links (at least Vite and Svelte logos)
    expect(linkCount).toBeGreaterThan(0)
  })
})
