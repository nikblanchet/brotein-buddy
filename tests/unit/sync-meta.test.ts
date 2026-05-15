/**
 * Unit tests for the persistent sync metadata module.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadSyncMeta, saveSyncMeta, clearSyncMeta } from '../../src/lib/sync-meta';

const KEY = 'BROTEINBUDDY_SYNC_META';

beforeEach(() => {
  localStorage.clear();
});

describe('loadSyncMeta', () => {
  it('returns defaults when no key is set', () => {
    expect(loadSyncMeta()).toEqual({
      dirty: false,
      lastServerUpdatedAt: null,
      lastSyncedAt: null,
    });
  });

  it('returns defaults when the JSON is malformed', () => {
    localStorage.setItem(KEY, '{not json');
    expect(loadSyncMeta()).toEqual({
      dirty: false,
      lastServerUpdatedAt: null,
      lastSyncedAt: null,
    });
  });

  it('coerces missing fields to defaults', () => {
    localStorage.setItem(KEY, JSON.stringify({ dirty: true }));
    expect(loadSyncMeta()).toEqual({
      dirty: true,
      lastServerUpdatedAt: null,
      lastSyncedAt: null,
    });
  });

  it('round-trips a fully populated meta record', () => {
    const meta = {
      dirty: true,
      lastServerUpdatedAt: '2026-05-14T12:00:00.000Z',
      lastSyncedAt: '2026-05-14T12:00:00.500Z',
    };
    saveSyncMeta(meta);
    expect(loadSyncMeta()).toEqual(meta);
  });
});

describe('saveSyncMeta', () => {
  it('persists the meta record as JSON', () => {
    saveSyncMeta({
      dirty: true,
      lastServerUpdatedAt: '2026-05-14T12:00:00.000Z',
      lastSyncedAt: null,
    });
    const raw = localStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toMatchObject({ dirty: true });
  });
});

describe('clearSyncMeta', () => {
  it('removes the meta key', () => {
    saveSyncMeta({ dirty: true, lastServerUpdatedAt: null, lastSyncedAt: null });
    expect(localStorage.getItem(KEY)).not.toBeNull();
    clearSyncMeta();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('is a no-op when the key is already absent', () => {
    expect(() => clearSyncMeta()).not.toThrow();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
