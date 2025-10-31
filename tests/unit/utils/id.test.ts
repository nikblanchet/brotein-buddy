/**
 * Unit tests for ID generation utilities
 *
 * Tests the ID generation functions used throughout the application.
 */

import { describe, it, expect } from 'vitest';
import { generateFlavorId, generateBoxId } from '../../../src/lib/utils/id.js';

describe('id utilities', () => {
  describe('generateFlavorId', () => {
    it('generates ID with flavor prefix', () => {
      const id = generateFlavorId();
      expect(id).toMatch(/^flavor_\d+$/);
    });

    it('generates unique IDs', async () => {
      const id1 = generateFlavorId();
      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 2));
      const id2 = generateFlavorId();
      expect(id1).not.toBe(id2);
    });

    it('uses timestamp-based generation', () => {
      const before = Date.now();
      const id = generateFlavorId();
      const after = Date.now();

      const timestamp = parseInt(id.replace('flavor_', ''), 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('generateBoxId', () => {
    it('generates ID with box prefix', () => {
      const id = generateBoxId();
      expect(id).toMatch(/^box_\d+$/);
    });

    it('generates unique IDs', async () => {
      const id1 = generateBoxId();
      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 2));
      const id2 = generateBoxId();
      expect(id1).not.toBe(id2);
    });

    it('uses timestamp-based generation', () => {
      const before = Date.now();
      const id = generateBoxId();
      const after = Date.now();

      const timestamp = parseInt(id.replace('box_', ''), 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });
});
