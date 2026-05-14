/**
 * Unit tests for the backup/restore module.
 *
 * Target: 100% coverage (critical path — restore failure would silently
 * destroy user data, so every branch needs an assertion).
 */

import { describe, it, expect } from 'vitest';
import {
  exportStateAsJson,
  parseBackupJson,
  buildBackupFilename,
  BackupError,
} from '../../src/lib/backup';
import { createDefaultAppState, type AppState } from '../../src/types/models';

const sampleState: AppState = {
  version: 3,
  boxes: [
    {
      id: 'box1',
      flavorId: 'flavor1',
      quantity: 12,
      location: { stack: 1, height: 0 },
      isOpen: false,
    },
    {
      id: 'box2',
      flavorId: 'flavor2',
      quantity: 3,
      location: { stack: 2, height: 1 },
      isOpen: true,
    },
  ],
  flavors: [
    { id: 'flavor1', name: 'Chocolate', randomPool: 'caffeinated' },
    { id: 'flavor2', name: 'Vanilla', randomPool: 'caffeine-free' },
  ],
  favoriteFlavorId: 'flavor1',
  settings: {},
  events: [
    {
      id: 'ev_received_1',
      timestamp: '2026-05-01T08:30:00.000Z',
      type: 'box_received',
      boxId: 'box1',
      flavorId: 'flavor1',
      quantity: 12,
      location: { stack: 1, height: 0 },
      isOpen: false,
    },
    {
      id: 'ev_taken_1',
      timestamp: '2026-05-02T14:15:00.000Z',
      type: 'shake_taken',
      boxId: 'box1',
      flavorId: 'flavor1',
      method: 'random',
      pool: 'caffeinated',
    },
    {
      id: 'ev_rejected_1',
      timestamp: '2026-05-03T09:00:00.000Z',
      type: 'shake_rejected',
      rejectedFlavorId: 'flavor2',
      method: 'random',
      pool: 'caffeine-free',
    },
  ],
};

describe('exportStateAsJson', () => {
  it('serializes state as indented JSON', () => {
    const result = exportStateAsJson(sampleState);
    expect(result).toContain('\n');
    expect(result).toMatch(/^\{\n {2}"version"/);
  });

  it('round-trips through parseBackupJson without loss', () => {
    const serialized = exportStateAsJson(sampleState);
    const restored = parseBackupJson(serialized);
    expect(restored).toEqual(sampleState);
  });

  it('round-trips a default (empty) state', () => {
    const empty = createDefaultAppState();
    const restored = parseBackupJson(exportStateAsJson(empty));
    expect(restored).toEqual(empty);
  });
});

describe('parseBackupJson', () => {
  it('parses a current-version backup', () => {
    const json = JSON.stringify(sampleState);
    expect(parseBackupJson(json)).toEqual(sampleState);
  });

  it('upgrades a v1 backup through the storage migration', () => {
    const v1Backup = JSON.stringify({
      version: 1,
      boxes: [],
      flavors: [
        { id: 'flavor1', name: 'Chocolate', excludeFromRandom: false },
        { id: 'flavor2', name: 'Vanilla', excludeFromRandom: true },
      ],
      favoriteFlavorId: null,
      settings: {},
    });

    const result = parseBackupJson(v1Backup);

    expect(result.version).toBe(3);
    expect(result.flavors).toEqual([
      { id: 'flavor1', name: 'Chocolate', randomPool: 'caffeine-free' },
      { id: 'flavor2', name: 'Vanilla', randomPool: null },
    ]);
    expect(result.events).toEqual([]);
  });

  it('upgrades a v2 backup (no events field) to v3 with an empty events array', () => {
    const v2Backup = JSON.stringify({
      version: 2,
      boxes: [
        {
          id: 'box1',
          flavorId: 'flavor1',
          quantity: 12,
          location: { stack: 0, height: 0 },
          isOpen: false,
        },
      ],
      flavors: [{ id: 'flavor1', name: 'Chocolate', randomPool: 'caffeinated' }],
      favoriteFlavorId: 'flavor1',
      settings: {},
    });

    const result = parseBackupJson(v2Backup);

    expect(result.version).toBe(3);
    expect(result.events).toEqual([]);
    expect(result.boxes).toHaveLength(1);
    expect(result.favoriteFlavorId).toBe('flavor1');
  });

  it('throws BackupError(empty) on empty input', () => {
    expect(() => parseBackupJson('')).toThrow(BackupError);
    expect(() => parseBackupJson('   \n  ')).toThrow(expect.objectContaining({ reason: 'empty' }));
  });

  it('throws BackupError(malformed-json) when JSON.parse fails', () => {
    expect(() => parseBackupJson('not json {')).toThrow(
      expect.objectContaining({ reason: 'malformed-json' })
    );
  });

  it('throws BackupError(schema-invalid) when payload does not match AppState', () => {
    const bogus = JSON.stringify({ hello: 'world' });
    expect(() => parseBackupJson(bogus)).toThrow(
      expect.objectContaining({ reason: 'schema-invalid' })
    );
  });

  it('throws BackupError(schema-invalid) when a box has an invalid field', () => {
    const corrupt = JSON.stringify({
      ...sampleState,
      boxes: [{ ...sampleState.boxes[0], quantity: -1 }],
    });
    expect(() => parseBackupJson(corrupt)).toThrow(
      expect.objectContaining({ reason: 'schema-invalid' })
    );
  });

  it('throws BackupError(schema-invalid) when a flavor has an invalid randomPool', () => {
    const corrupt = JSON.stringify({
      ...sampleState,
      flavors: [{ id: 'f', name: 'Foo', randomPool: 'invalid-pool' }],
    });
    expect(() => parseBackupJson(corrupt)).toThrow(
      expect.objectContaining({ reason: 'schema-invalid' })
    );
  });
});

describe('buildBackupFilename', () => {
  it('uses YYYY-MM-DD format', () => {
    const filename = buildBackupFilename(new Date(2026, 4, 14));
    expect(filename).toBe('brotein-buddy-backup-2026-05-14.json');
  });

  it('zero-pads single-digit month and day', () => {
    const filename = buildBackupFilename(new Date(2026, 0, 3));
    expect(filename).toBe('brotein-buddy-backup-2026-01-03.json');
  });

  it('defaults to today when no date is provided', () => {
    const filename = buildBackupFilename();
    expect(filename).toMatch(/^brotein-buddy-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });
});

describe('BackupError', () => {
  it('exposes reason and message', () => {
    const err = new BackupError('empty', 'Empty file');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('BackupError');
    expect(err.reason).toBe('empty');
    expect(err.message).toBe('Empty file');
  });
});
