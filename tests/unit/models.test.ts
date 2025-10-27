import { describe, it, expect } from 'vitest';
import {
  isLocation,
  isFlavor,
  isBox,
  isAppState,
  createDefaultAppState,
  type Location,
  type Flavor,
  type Box,
  type AppState,
} from '../../src/types/models';

describe('isLocation', () => {
  it('returns true for valid Location', () => {
    const validLocation: Location = { stack: 0, height: 0 };
    expect(isLocation(validLocation)).toBe(true);
  });

  it('returns true for Location with positive values', () => {
    const location: Location = { stack: 5, height: 10 };
    expect(isLocation(location)).toBe(true);
  });

  it('returns false for negative stack', () => {
    const invalidLocation = { stack: -1, height: 0 };
    expect(isLocation(invalidLocation)).toBe(false);
  });

  it('returns false for negative height', () => {
    const invalidLocation = { stack: 0, height: -1 };
    expect(isLocation(invalidLocation)).toBe(false);
  });

  it('returns false for non-integer stack', () => {
    const invalidLocation = { stack: 1.5, height: 0 };
    expect(isLocation(invalidLocation)).toBe(false);
  });

  it('returns false for non-integer height', () => {
    const invalidLocation = { stack: 0, height: 2.7 };
    expect(isLocation(invalidLocation)).toBe(false);
  });

  it('returns false for missing stack property', () => {
    const invalidLocation = { height: 0 };
    expect(isLocation(invalidLocation)).toBe(false);
  });

  it('returns false for missing height property', () => {
    const invalidLocation = { stack: 0 };
    expect(isLocation(invalidLocation)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isLocation(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isLocation(undefined)).toBe(false);
  });

  it('returns false for string', () => {
    expect(isLocation('not a location')).toBe(false);
  });

  it('returns false for number', () => {
    expect(isLocation(42)).toBe(false);
  });

  it('returns false for array', () => {
    expect(isLocation([0, 0])).toBe(false);
  });
});

describe('isFlavor', () => {
  it('returns true for valid Flavor', () => {
    const validFlavor: Flavor = {
      id: 'flavor_001',
      name: 'Chocolate',
      excludeFromRandom: false,
    };
    expect(isFlavor(validFlavor)).toBe(true);
  });

  it('returns true for Flavor with excludeFromRandom true', () => {
    const flavor: Flavor = {
      id: 'flavor_002',
      name: 'Vanilla',
      excludeFromRandom: true,
    };
    expect(isFlavor(flavor)).toBe(true);
  });

  it('returns false for empty id', () => {
    const invalidFlavor = {
      id: '',
      name: 'Chocolate',
      excludeFromRandom: false,
    };
    expect(isFlavor(invalidFlavor)).toBe(false);
  });

  it('returns false for empty name', () => {
    const invalidFlavor = {
      id: 'flavor_001',
      name: '',
      excludeFromRandom: false,
    };
    expect(isFlavor(invalidFlavor)).toBe(false);
  });

  it('returns false for missing id', () => {
    const invalidFlavor = {
      name: 'Chocolate',
      excludeFromRandom: false,
    };
    expect(isFlavor(invalidFlavor)).toBe(false);
  });

  it('returns false for missing name', () => {
    const invalidFlavor = {
      id: 'flavor_001',
      excludeFromRandom: false,
    };
    expect(isFlavor(invalidFlavor)).toBe(false);
  });

  it('returns false for missing excludeFromRandom', () => {
    const invalidFlavor = {
      id: 'flavor_001',
      name: 'Chocolate',
    };
    expect(isFlavor(invalidFlavor)).toBe(false);
  });

  it('returns false for non-boolean excludeFromRandom', () => {
    const invalidFlavor = {
      id: 'flavor_001',
      name: 'Chocolate',
      excludeFromRandom: 'false',
    };
    expect(isFlavor(invalidFlavor)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isFlavor(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isFlavor(undefined)).toBe(false);
  });
});

describe('isBox', () => {
  it('returns true for valid Box', () => {
    const validBox: Box = {
      id: 'box_001',
      flavorId: 'flavor_001',
      quantity: 12,
      location: { stack: 0, height: 0 },
      isOpen: false,
    };
    expect(isBox(validBox)).toBe(true);
  });

  it('returns true for open Box', () => {
    const box: Box = {
      id: 'box_002',
      flavorId: 'flavor_002',
      quantity: 5,
      location: { stack: 1, height: 2 },
      isOpen: true,
    };
    expect(isBox(box)).toBe(true);
  });

  it('returns true for Box with zero quantity', () => {
    const box: Box = {
      id: 'box_003',
      flavorId: 'flavor_003',
      quantity: 0,
      location: { stack: 0, height: 0 },
      isOpen: true,
    };
    expect(isBox(box)).toBe(true);
  });

  it('returns false for negative quantity', () => {
    const invalidBox = {
      id: 'box_001',
      flavorId: 'flavor_001',
      quantity: -1,
      location: { stack: 0, height: 0 },
      isOpen: false,
    };
    expect(isBox(invalidBox)).toBe(false);
  });

  it('returns false for non-integer quantity', () => {
    const invalidBox = {
      id: 'box_001',
      flavorId: 'flavor_001',
      quantity: 12.5,
      location: { stack: 0, height: 0 },
      isOpen: false,
    };
    expect(isBox(invalidBox)).toBe(false);
  });

  it('returns false for empty id', () => {
    const invalidBox = {
      id: '',
      flavorId: 'flavor_001',
      quantity: 12,
      location: { stack: 0, height: 0 },
      isOpen: false,
    };
    expect(isBox(invalidBox)).toBe(false);
  });

  it('returns false for empty flavorId', () => {
    const invalidBox = {
      id: 'box_001',
      flavorId: '',
      quantity: 12,
      location: { stack: 0, height: 0 },
      isOpen: false,
    };
    expect(isBox(invalidBox)).toBe(false);
  });

  it('returns false for invalid location', () => {
    const invalidBox = {
      id: 'box_001',
      flavorId: 'flavor_001',
      quantity: 12,
      location: { stack: -1, height: 0 },
      isOpen: false,
    };
    expect(isBox(invalidBox)).toBe(false);
  });

  it('returns false for missing location', () => {
    const invalidBox = {
      id: 'box_001',
      flavorId: 'flavor_001',
      quantity: 12,
      isOpen: false,
    };
    expect(isBox(invalidBox)).toBe(false);
  });

  it('returns false for non-boolean isOpen', () => {
    const invalidBox = {
      id: 'box_001',
      flavorId: 'flavor_001',
      quantity: 12,
      location: { stack: 0, height: 0 },
      isOpen: 'false',
    };
    expect(isBox(invalidBox)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isBox(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isBox(undefined)).toBe(false);
  });
});

describe('isAppState', () => {
  it('returns true for valid empty AppState', () => {
    const validAppState: AppState = {
      boxes: [],
      flavors: [],
      favoriteFlavorId: null,
      settings: {},
    };
    expect(isAppState(validAppState)).toBe(true);
  });

  it('returns true for AppState with data', () => {
    const appState: AppState = {
      boxes: [
        {
          id: 'box_001',
          flavorId: 'flavor_001',
          quantity: 12,
          location: { stack: 0, height: 0 },
          isOpen: false,
        },
      ],
      flavors: [
        {
          id: 'flavor_001',
          name: 'Chocolate',
          excludeFromRandom: false,
        },
      ],
      favoriteFlavorId: 'flavor_001',
      settings: {},
    };
    expect(isAppState(appState)).toBe(true);
  });

  it('returns true for AppState with null favoriteFlavorId', () => {
    const appState: AppState = {
      boxes: [],
      flavors: [],
      favoriteFlavorId: null,
      settings: {},
    };
    expect(isAppState(appState)).toBe(true);
  });

  it('returns false for non-array boxes', () => {
    const invalidAppState = {
      boxes: 'not an array',
      flavors: [],
      favoriteFlavorId: null,
      settings: {},
    };
    expect(isAppState(invalidAppState)).toBe(false);
  });

  it('returns false for non-array flavors', () => {
    const invalidAppState = {
      boxes: [],
      flavors: 'not an array',
      favoriteFlavorId: null,
      settings: {},
    };
    expect(isAppState(invalidAppState)).toBe(false);
  });

  it('returns false for invalid box in boxes array', () => {
    const invalidAppState = {
      boxes: [{ id: '', flavorId: 'invalid', quantity: -1 }],
      flavors: [],
      favoriteFlavorId: null,
      settings: {},
    };
    expect(isAppState(invalidAppState)).toBe(false);
  });

  it('returns false for invalid flavor in flavors array', () => {
    const invalidAppState = {
      boxes: [],
      flavors: [{ id: '', name: 'Invalid' }],
      favoriteFlavorId: null,
      settings: {},
    };
    expect(isAppState(invalidAppState)).toBe(false);
  });

  it('returns false for numeric favoriteFlavorId', () => {
    const invalidAppState = {
      boxes: [],
      flavors: [],
      favoriteFlavorId: 123,
      settings: {},
    };
    expect(isAppState(invalidAppState)).toBe(false);
  });

  it('returns false for null settings', () => {
    const invalidAppState = {
      boxes: [],
      flavors: [],
      favoriteFlavorId: null,
      settings: null,
    };
    expect(isAppState(invalidAppState)).toBe(false);
  });

  it('returns false for missing boxes', () => {
    const invalidAppState = {
      flavors: [],
      favoriteFlavorId: null,
      settings: {},
    };
    expect(isAppState(invalidAppState)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAppState(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAppState(undefined)).toBe(false);
  });
});

describe('createDefaultAppState', () => {
  it('creates a valid empty AppState', () => {
    const defaultState = createDefaultAppState();
    expect(isAppState(defaultState)).toBe(true);
  });

  it('has empty boxes array', () => {
    const defaultState = createDefaultAppState();
    expect(defaultState.boxes).toEqual([]);
  });

  it('has empty flavors array', () => {
    const defaultState = createDefaultAppState();
    expect(defaultState.flavors).toEqual([]);
  });

  it('has null favoriteFlavorId', () => {
    const defaultState = createDefaultAppState();
    expect(defaultState.favoriteFlavorId).toBeNull();
  });

  it('has empty settings object', () => {
    const defaultState = createDefaultAppState();
    expect(defaultState.settings).toEqual({});
  });

  it('creates a new object each time', () => {
    const state1 = createDefaultAppState();
    const state2 = createDefaultAppState();
    expect(state1).not.toBe(state2);
    expect(state1.boxes).not.toBe(state2.boxes);
    expect(state1.flavors).not.toBe(state2.flavors);
    expect(state1.settings).not.toBe(state2.settings);
  });
});
