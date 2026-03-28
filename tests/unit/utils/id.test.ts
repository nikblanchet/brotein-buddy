/**
 * Unit tests for ID generation utilities
 *
 * Tests the ID generation functions used throughout the application.
 */

import { describe, it, expect } from 'vitest';
import { generateFlavorId, generateBoxId } from '../../../src/lib/utils/id.js';

describe('id utilities', () => {
  describe('generateFlavorId', () => {
    it('generates ID with flavor prefix and UUID format', () => {
      const id = generateFlavorId();
      expect(id).toMatch(/^flavor_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('generates unique IDs', () => {
      const id1 = generateFlavorId();
      const id2 = generateFlavorId();
      expect(id1).not.toBe(id2);
    });

    it('generates unique IDs in a tight loop', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateFlavorId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('generateBoxId', () => {
    it('generates ID with box prefix and UUID format', () => {
      const id = generateBoxId();
      expect(id).toMatch(/^box_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('generates unique IDs', () => {
      const id1 = generateBoxId();
      const id2 = generateBoxId();
      expect(id1).not.toBe(id2);
    });

    it('generates unique IDs in a tight loop', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateBoxId());
      }
      expect(ids.size).toBe(100);
    });
  });
});
