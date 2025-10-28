import { describe, it, expect } from 'vitest';
import { ROUTES, type RouteParams } from '../../../src/lib/router/routes';

/**
 * Unit tests for route configuration
 *
 * Tests the ROUTES constants and route parameter helper functions
 * to ensure type-safe navigation throughout the application.
 */

describe('Routes Configuration', () => {
  describe('ROUTES constants', () => {
    it('defines home route', () => {
      expect(ROUTES.HOME).toBe('/');
    });

    it('defines random route', () => {
      expect(ROUTES.RANDOM).toBe('/random');
    });

    it('defines random confirm route', () => {
      expect(ROUTES.RANDOM_CONFIRM).toBe('/random/confirm');
    });

    it('defines inventory route', () => {
      expect(ROUTES.INVENTORY).toBe('/inventory');
    });

    it('defines inventory rearrange route', () => {
      expect(ROUTES.INVENTORY_REARRANGE).toBe('/inventory/rearrange');
    });
  });

  describe('ROUTES.INVENTORY_BOX_EDIT parameter helper', () => {
    it('generates route with simple boxId', () => {
      expect(ROUTES.INVENTORY_BOX_EDIT('box123')).toBe('/inventory/box123/edit');
    });

    it('generates route with UUID format boxId', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(ROUTES.INVENTORY_BOX_EDIT(uuid)).toBe(`/inventory/${uuid}/edit`);
    });

    it('generates route with boxId containing dashes', () => {
      const boxId = 'box-with-dashes';
      expect(ROUTES.INVENTORY_BOX_EDIT(boxId)).toBe('/inventory/box-with-dashes/edit');
    });

    it('generates route with boxId containing underscores', () => {
      const boxId = 'box_with_underscores';
      expect(ROUTES.INVENTORY_BOX_EDIT(boxId)).toBe('/inventory/box_with_underscores/edit');
    });

    it('generates route with numeric boxId', () => {
      expect(ROUTES.INVENTORY_BOX_EDIT('12345')).toBe('/inventory/12345/edit');
    });

    it('generates route with mixed alphanumeric boxId', () => {
      const boxId = 'box123abc';
      expect(ROUTES.INVENTORY_BOX_EDIT(boxId)).toBe('/inventory/box123abc/edit');
    });

    it('returns string type', () => {
      const result = ROUTES.INVENTORY_BOX_EDIT('test');
      expect(typeof result).toBe('string');
    });
  });

  describe('route structure validation', () => {
    it('all non-parameterized routes start with /', () => {
      expect(ROUTES.HOME).toMatch(/^\//);
      expect(ROUTES.RANDOM).toMatch(/^\//);
      expect(ROUTES.RANDOM_CONFIRM).toMatch(/^\//);
      expect(ROUTES.INVENTORY).toMatch(/^\//);
      expect(ROUTES.INVENTORY_REARRANGE).toMatch(/^\//);
    });

    it('all non-parameterized routes do not end with /', () => {
      const routes = [
        ROUTES.RANDOM,
        ROUTES.RANDOM_CONFIRM,
        ROUTES.INVENTORY,
        ROUTES.INVENTORY_REARRANGE,
      ];

      routes.forEach((route) => {
        expect(route).not.toMatch(/\/$/);
      });
    });

    it('parameterized route helper returns route starting with /', () => {
      const route = ROUTES.INVENTORY_BOX_EDIT('test');
      expect(route).toMatch(/^\//);
    });

    it('parameterized route helper returns route ending with /edit', () => {
      const route = ROUTES.INVENTORY_BOX_EDIT('test');
      expect(route).toMatch(/\/edit$/);
    });
  });

  describe('RouteParams types', () => {
    it('RouteParams interface has inventoryBoxEdit property', () => {
      // This is a type-level test - if it compiles, the test passes
      const params: RouteParams['inventoryBoxEdit'] = { boxId: 'test' };
      expect(params.boxId).toBe('test');
    });

    it('inventoryBoxEdit params require boxId', () => {
      // Type-level validation
      const params: RouteParams['inventoryBoxEdit'] = { boxId: '123' };
      expect(params).toHaveProperty('boxId');
    });
  });
});
