/**
 * Sample data generator for demo and first-time user experience.
 *
 * Provides realistic sample inventory data for:
 * - Demo screenshots
 * - Testing on new devices
 * - Portfolio demonstrations
 * - First-time user welcome flow
 *
 * @module lib/sample-data
 */

import type { AppState } from '../types/models';

/**
 * Generates realistic sample inventory data for demonstration purposes.
 *
 * The sample data includes:
 * - 5 popular protein shake flavors
 * - 7 boxes in various states (open/closed, different quantities)
 * - Multiple stacks demonstrating the visual grid layout
 * - A configured favorite flavor (Chocolate)
 *
 * @returns Complete AppState object with sample data
 *
 * @example
 * ```typescript
 * import { generateSampleData } from './sample-data';
 * import { saveState } from './storage';
 *
 * // Load sample data into the app
 * const sampleState = generateSampleData();
 * saveState(sampleState);
 * ```
 *
 * @remarks
 * This function creates brand new data each time it's called. All IDs
 * are simple strings for readability in demos. In production, you might
 * use UUIDs or timestamp-based IDs.
 *
 * Box quantities and locations are designed to demonstrate key features:
 * - Priority selection (open before unopened, lower quantity first)
 * - Visual inventory grid with multiple stacks
 * - Out-of-stock flavor (Strawberry has 0 total quantity)
 * - Weighted random selection (Chocolate has highest total quantity)
 */
export function generateSampleData(): AppState {
  return {
    version: 1,

    flavors: [
      {
        id: 'chocolate',
        name: 'Chocolate',
        excludeFromRandom: false,
      },
      {
        id: 'vanilla',
        name: 'Vanilla',
        excludeFromRandom: false,
      },
      {
        id: 'strawberry',
        name: 'Strawberry',
        excludeFromRandom: false,
      },
      {
        id: 'cookies-cream',
        name: 'Cookies & Cream',
        excludeFromRandom: false,
      },
      {
        id: 'peanut-butter',
        name: 'Peanut Butter',
        excludeFromRandom: true, // Excluded - saving this one!
      },
    ],

    boxes: [
      // Stack 1: Chocolate boxes (2 boxes, demonstrating open before unopened priority)
      {
        id: 'box-1',
        flavorId: 'chocolate',
        quantity: 4,
        location: { stack: 1, height: 0 },
        isOpen: true, // Open box with lower quantity - should be selected first
      },
      {
        id: 'box-2',
        flavorId: 'chocolate',
        quantity: 12,
        location: { stack: 1, height: 1 },
        isOpen: false, // Unopened box - second priority
      },

      // Stack 2: Vanilla and Cookies & Cream (mixed flavors in same stack)
      {
        id: 'box-3',
        flavorId: 'vanilla',
        quantity: 8,
        location: { stack: 2, height: 0 },
        isOpen: true,
      },
      {
        id: 'box-4',
        flavorId: 'cookies-cream',
        quantity: 6,
        location: { stack: 2, height: 1 },
        isOpen: true,
      },

      // Stack 3: Peanut Butter (excluded from random)
      {
        id: 'box-5',
        flavorId: 'peanut-butter',
        quantity: 10,
        location: { stack: 3, height: 0 },
        isOpen: false,
      },

      // Stack 4: Vanilla (demonstrating multiple boxes of same flavor in different stacks)
      {
        id: 'box-6',
        flavorId: 'vanilla',
        quantity: 2,
        location: { stack: 4, height: 0 },
        isOpen: true, // Lower quantity than box-3, should be selected first
      },

      // Stack 5: Cookies & Cream
      {
        id: 'box-7',
        flavorId: 'cookies-cream',
        quantity: 12,
        location: { stack: 5, height: 0 },
        isOpen: false,
      },

      // Note: Strawberry has no boxes, demonstrating out-of-stock state
    ],

    favoriteFlavorId: 'chocolate', // Set favorite for quick-pick demonstration

    settings: {}, // Empty in v1
  };
}
